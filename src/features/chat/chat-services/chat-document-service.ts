"use server";

import { userHashedId } from "@/features/auth/helpers";
import { initDBContainer } from "@/features/common/cosmos";
import { AzureCogSearch } from "@/features/langchain/vector-stores/azure-cog-search/azure-cog-vector-store";
import {
  AzureKeyCredential,
  DocumentAnalysisClient,
} from "@azure/ai-form-recognizer";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { nanoid } from "nanoid";
import * as mammoth from "mammoth";
import MsgReader from "@kenjiuno/msgreader";
import {
  CHAT_DOCUMENT_ATTRIBUTE,
  ChatDocumentModel,
  FaqDocumentIndex,
} from "./models";

const MAX_DOCUMENT_SIZE = 100000000;

const FORM_RECOGNIZER_EXTRACTION_MIME_TYPE_SET = [
	"application/pdf",
	"image/jpeg",
	"image/png",
];

const MAMMOTH_EXTRACTION_MIME_TYPE_SET = [
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/msword",
];

const TEXT_EXTRACTION_MIME_TYPE_SET = [
	"text/plain",
];

const MSGREADER_EXTRACTION_MIME_TYPE_SET = [
	"application/vnd.ms-outlook",

	//	Hack because the browser fails to detect the correct MIME type for msg files
	"application/octet-stream",
];

const ALLOWED_MIME_TYPE_SET = FORM_RECOGNIZER_EXTRACTION_MIME_TYPE_SET
	.concat(MAMMOTH_EXTRACTION_MIME_TYPE_SET)
	.concat(TEXT_EXTRACTION_MIME_TYPE_SET)
	.concat(MSGREADER_EXTRACTION_MIME_TYPE_SET);

export const UploadDocument = async (formData: FormData) => {
  const { docs, file, chatThreadId } = await LoadFile(formData);
  const splitDocuments = await SplitDocuments(docs);
  const docPageContents = splitDocuments.map((item) => item.pageContent);
  await IndexDocuments(file, docPageContents, chatThreadId);
  return file.name;
};

const LoadFile = async (formData: FormData) => {
	const file: File | null = formData.get("file") as unknown as File;
	const chatThreadId: string = formData.get("id") as unknown as string;
	const docs: Document[] = [];
	let errorMessage = null;
	let paragraphs: any[] | undefined;

	if (!file) {
		errorMessage = "Unable to load file. Please try again or contact ApplicationDevelopment@CreativeDC.com for assistance.";
	} else if (file.size > MAX_DOCUMENT_SIZE) {
		errorMessage = "File size is too large. Please upload a file less than 100MB.";
	} else if (!ALLOWED_MIME_TYPE_SET.includes(file.type)) {
		errorMessage = "Invalid file type. Currently only DOCX, TXT, MSG, PDF, JPG, and PNG files are supported. Have a different file type? Contact ApplicationDevelopment@CreativeDC.com and let us know.";
	}

	try
	{
		if (!errorMessage) {

			if (MAMMOTH_EXTRACTION_MIME_TYPE_SET.includes(file.type)) {
				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				const result = await mammoth.extractRawText({ buffer });
				
				paragraphs = result
					.value
					?.split("\n")
					?.filter((paragraph) => paragraph.trim() !== "");

			} else if (FORM_RECOGNIZER_EXTRACTION_MIME_TYPE_SET.includes(file.type)) {
				const client = initDocumentIntelligence();

				const blob = new Blob([file], { type: file.type });

				const poller = await client.beginAnalyzeDocument(
					"prebuilt-document",
					await blob.arrayBuffer()
				);

				paragraphs = (await poller.pollUntilDone())
					.paragraphs
					?.map((paragraph) => paragraph.content);

			} else if (TEXT_EXTRACTION_MIME_TYPE_SET.includes(file.type)) {
				const text = await file.text();
				paragraphs = text
					?.split("\n")
					?.filter((paragraph) => paragraph.trim() !== "");

			} else if (MSGREADER_EXTRACTION_MIME_TYPE_SET.includes(file.type)) {
				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				const msgReader = new MsgReader(buffer);
				const emailData = await msgReader.getFileData();

				//	Add message metadata along with body
				paragraphs = [
					"From: " + emailData.senderName + " <" + emailData.senderEmail + ">"
					, "To: " + emailData.recipients
					, "Subject: " + emailData.subject
					, "Date: " + emailData.messageDeliveryTime
				]
					.concat(emailData
						.body
						?.split("\n")
						?.filter((paragraph) => paragraph.trim() !== "") 
						?? []
					);
			}

			if (!paragraphs || paragraphs.length === 0) {
				errorMessage = "Unable to find any text for processing in this file.";
			}

			if (paragraphs && !errorMessage) {
				for (const paragraph of paragraphs) {
					const doc: Document = {
						pageContent: paragraph,
						metadata: {
							file: file.name,
						},
					};
					
					docs.push(doc);
				}
			} 
		}
	}
	catch (error)
	{
		errorMessage = "Unknown error. Please contact ApplicationDevelopment@CreativeDC.com for assistance.";
	}

	if (errorMessage) {
		throw new Error(errorMessage, { cause: errorMessage });
	}

	return { docs, file, chatThreadId };
};

const SplitDocuments = async (docs: Array<Document>) => {
  const allContent = docs.map((doc) => doc.pageContent).join("\n");
  const splitter = new RecursiveCharacterTextSplitter();
  const output = await splitter.createDocuments([allContent]);
  return output;
};

const IndexDocuments = async (
  file: File,
  docs: string[],
  chatThreadId: string
) => {
  const vectorStore = initAzureSearchVectorStore();
  const documentsToIndex: FaqDocumentIndex[] = [];
  let index = 0;
  for (const doc of docs) {
    const docToAdd: FaqDocumentIndex = {
      id: nanoid(),
      chatThreadId,
      user: await userHashedId(),
      pageContent: doc,
      metadata: file.name,
      embedding: [],
    };

    documentsToIndex.push(docToAdd);
    index++;
  }

  await vectorStore.addDocuments(documentsToIndex);
  await UpsertChatDocument(file.name, chatThreadId);
};

export const initAzureSearchVectorStore = () => {
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

export const initDocumentIntelligence = () => {
  const client = new DocumentAnalysisClient(
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    new AzureKeyCredential(process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY),
    {
      apiVersion: "2022-08-31",
    }
  );

  return client;
};

export const UpsertChatDocument = async (
  fileName: string,
  chatThreadID: string
) => {
  const modelToSave: ChatDocumentModel = {
    chatThreadId: chatThreadID,
    id: nanoid(),
    userId: await userHashedId(),
    createdAt: new Date(),
    type: CHAT_DOCUMENT_ATTRIBUTE,
    isDeleted: false,
    name: fileName,
  };

  const container = await initDBContainer();
  await container.items.upsert(modelToSave);
};
