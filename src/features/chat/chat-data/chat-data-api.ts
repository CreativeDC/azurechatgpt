import { userHashedId } from "@/features/auth/helpers";
import { CosmosDBChatMessageHistory } from "@/features/langchain/memory/cosmosdb/cosmosdb";
import { LangChainStream, StreamingTextResponse } from "ai";
import { loadQAMapReduceChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { BufferWindowMemory } from "langchain/memory";
import {
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from "langchain/prompts";
import { AzureCogSearch } from "../../langchain/vector-stores/azure-cog-search/azure-cog-vector-store";
import { insertPromptAndResponse } from "../chat-services/chat-service";
import { initAndGuardChatSession } from "../chat-services/chat-thread-service";
import { FaqDocumentIndex, GPT_3_5, GPT_4, GPT_4_32K, LLMModel, PromptGPTProps } from "../chat-services/models";
import { transformConversationStyleToTemperature } from "../chat-services/utils";
import { AI_NAME } from "@/features/theme/customise";

export const ChatData = async (props: PromptGPTProps) => {
	const { lastHumanMessage, id, chatThread } = await initAndGuardChatSession(
		props
	);

	const chatModel = new ChatOpenAI({
	modelName: chatThread.model,
	azureOpenAIApiDeploymentName: chatThread.model.replace(".", ""),
		temperature: transformConversationStyleToTemperature(
			chatThread.conversationStyle
		),
		streaming: true,
	});

	const relevantDocuments = await findRelevantDocuments(
		lastHumanMessage.content,
		id
	);

	const defineSystemPrompt = () => {
		const system_combine_template =
		`- You are ${AI_NAME}; a helpful AI assistant for Creative Associates International.
		- Provide clear and concise responses, and respond with polite and professional answers.
		- Avoid unnecessary explanation of your answers as well as tangential details unless requested.
		- Supply additional explanation or context if prompts indicate misconception or lack of understanding.
		- Answer questions truthfully and accurately unless explicitly requested otherwise.
		- If unsure about a response, indicate your uncertainty or lack of information.
		- If you need more information to provide an accurate response, ask for clarification.
		- The current date is ${new Date().toISOString().split('T')[0]}
		` +
		(
			((chatThread.model as LLMModel) == GPT_3_5) ? 
				`- Your knowledge cutoff is September 2021.
				- Your model is GPT-3.5.
				` :
			((chatThread.model as LLMModel) == GPT_4) ?
				`- Your knowledge cutoff is October 2023.
				- Your model is GPT-4o.
				` :
			((chatThread.model as LLMModel) == GPT_4_32K) ? 
				`- Your knowledge cutoff is September 2021.
				- Your model is GPT-4-32K.
				` :
				``
		) +
		`
		- Your task is to analyze the following document contents and respond to the prompt(s) that follow.
		- If the document is empty, respond that you're having trouble processing the document or it may be empty.
		- If you don't know the answer to a question, politely decline to answer. Don't try to make up an answer.
		- If asked to summarize a document, first determine the most important parts of the document (but don't output these unless requested), then attempt to summarize the document.
		- Remember your responses as you provide them to best answer any follow-up prompts.
		----------------
		document contents: {summaries}
		`;
	
		const combine_messages = [
			SystemMessagePromptTemplate.fromTemplate(system_combine_template),
			HumanMessagePromptTemplate.fromTemplate("{question}"),
		];
		const CHAT_COMBINE_PROMPT =
			ChatPromptTemplate.fromPromptMessages(combine_messages);
	
		return CHAT_COMBINE_PROMPT;
	};

	const chain = loadQAMapReduceChain(chatModel, {
		combinePrompt: defineSystemPrompt(),
	});

	const { stream, handlers } = LangChainStream({
		onCompletion: async (completion: string) => {
			await insertPromptAndResponse(id, lastHumanMessage.content, completion);
		},
	});

	const userId = await userHashedId();

	const memory = new BufferWindowMemory({
		k: 10,
		returnMessages: true,
		memoryKey: "history",
		chatHistory: new CosmosDBChatMessageHistory({
			sessionId: id,
			userId: userId,
		}),
	});

	chain.call(
		{
			input_documents: relevantDocuments,
			question: lastHumanMessage.content,
			memory: memory,
		},
		[handlers]
	);

	return new StreamingTextResponse(stream);
};

const findRelevantDocuments = async (query: string, chatThreadId: string) => {
	const vectorStore = initVectorStore();

	const relevantDocuments = await vectorStore.similaritySearch(query, 10, {
		vectorFields: vectorStore.config.vectorFieldName,
		filter: `user eq '${await userHashedId()}' and chatThreadId eq '${chatThreadId}'`,
	});

	return relevantDocuments;
};

const initVectorStore = () => {
	const embedding = new OpenAIEmbeddings();
	const azureSearch = new AzureCogSearch<FaqDocumentIndex>(embedding, {
		name: process.env.AZURE_SEARCH_NAME,
		indexName: process.env.AZURE_SEARCH_INDEX_NAME,
		apiKey: process.env.AZURE_SEARCH_API_KEY,
		apiVersion: process.env.AZURE_SEARCH_API_VERSION,
		vectorFieldName: "embedding",
	});

	return azureSearch;
};
