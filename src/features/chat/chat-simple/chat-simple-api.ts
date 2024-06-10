import { userHashedId } from "@/features/auth/helpers";
import { CosmosDBChatMessageHistory } from "@/features/langchain/memory/cosmosdb/cosmosdb";
import { AI_NAME } from "@/features/theme/customise";
import { LangChainStream, StreamingTextResponse } from "ai";
import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BufferWindowMemory } from "langchain/memory";
import {
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	MessagesPlaceholder,
	SystemMessagePromptTemplate,
} from "langchain/prompts";
import { initAndGuardChatSession } from "../chat-services/chat-thread-service";
import { LLMModel, GPT_3_5, GPT_4, GPT_4_32K, PromptGPTProps } from "../chat-services/models";
import { transformConversationStyleToTemperature } from "../chat-services/utils";

export const ChatSimple = async (props: PromptGPTProps) => {
	const { lastHumanMessage, id, chatThread } = await initAndGuardChatSession(
		props
	);

	const { stream, handlers } = LangChainStream();

	const userId = await userHashedId();

	const chat = new ChatOpenAI({
		modelName: chatThread.model,
		azureOpenAIApiDeploymentName: chatThread.model.replace(".", ""),
		temperature: transformConversationStyleToTemperature(
			chatThread.conversationStyle
		),
		streaming: true,
	});

	const memory = new BufferWindowMemory({
		k: 10,
		returnMessages: true,
		memoryKey: "history",
		chatHistory: new CosmosDBChatMessageHistory({
			sessionId: id,
			userId: userId,
		}),
	});

	const systemMessage = 
		`- You are ${AI_NAME}; a helpful AI assistant for Creative Associates International.
		- Provide clear and concise responses, and respond with polite and professional answers.
		- Avoid unnecessary explanation of your answers as well as tangential details unless requested.
		- Supply additional explanation or context if prompts indicate misconception or lack of understanding.
		- Answer questions truthfully and accurately unless explicitly requested otherwise.
		- If unsure about a response, indicate your uncertainty or lack of information.
		- If you need more information to provide an accurate response, ask for clarification.
		- The current date is ${new Date().toISOString().split('T')[0]}
		` +
	/*
		`- You are ${AI_NAME}; a helpful AI assistant for Creative Associates International, an international NGO working primarily with USAID to provide assistance around the world.
		- You will provide clear and concise responses, and you will respond with polite and professional answers.
		- You will answer questions truthfully and accurately unless it is explicitly requested you do otherwise.
		- The current date is ${new Date().toISOString().split('T')[0]}
		` +
		*/
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
		);

	const chatPrompt = ChatPromptTemplate.fromPromptMessages([
		SystemMessagePromptTemplate.fromTemplate(systemMessage),
		new MessagesPlaceholder("history"),
		HumanMessagePromptTemplate.fromTemplate("{input}"),
	]);

	const chain = new ConversationChain({
		llm: chat,
		memory,
		prompt: chatPrompt,
	});

	chain.call({ input: lastHumanMessage.content }, [handlers]);

	return new StreamingTextResponse(stream);
};
