"use client";

import ChatInput from "@/components/chat/chat-input";
import ChatLoading from "@/components/chat/chat-loading";
import ChatRow from "@/components/chat/chat-row";
import { useChatScrollAnchor } from "@/components/hooks/use-chat-scroll-anchor";
import { Card } from "@/components/ui/card";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { AI_NAME } from "@/features/theme/customise";
import { useChat } from "ai/react";
import { useSession } from "next-auth/react";
import { FC, FormEvent, useRef, useState } from "react";
import { UploadDocument } from "../chat-services/chat-document-service";
import {
	ChatMessageModel,
	ChatThreadModel,
	ChatType,
	ConversationStyle,
	LLMModel,
	PromptGPTBody,
} from "../chat-services/models";
import { transformCosmosToAIModel } from "../chat-services/utils";
import { EmptyState } from "./chat-empty-state";
import { ChatHeader } from "./chat-header";
import {useTheme} from "next-themes";


interface Prop {
	chats: Array<ChatMessageModel>;
	chatThread: ChatThreadModel;
}

export const ChatUI: FC<Prop> = (props) => {
	const { theme, setTheme } = useTheme();
	const { id, chatType, conversationStyle, model } = props.chatThread;

	const { data: session } = useSession();

	const [isUploadingFile, setIsUploadingFile] = useState(false);
	const [isFileNull, setIsFileNull] = useState(true);
	const [showFileUpload, setShowFileUpload] = useState<ChatType>("simple");

	const [chatBody, setBody] = useState<PromptGPTBody>({
		id: id,
		model: model,
		chatType: chatType,
		conversationStyle: conversationStyle,
	});

	const { toast } = useToast();
	const {
		messages,
		input,
		handleInputChange,
		handleSubmit,
		stop,
		reload,
		isLoading,
	} = useChat({
		onError,
		id,
		body: chatBody,
		initialMessages: transformCosmosToAIModel(props.chats),
	});

	const scrollRef = useRef<HTMLDivElement>(null);
	useChatScrollAnchor(messages, scrollRef);

	function onError(error: Error) {
		toast({
			variant: "destructive",
			description: error.message,
			action: (
				<ToastAction
					altText="Try again"
					onClick={() => {
						reload();
					}}
				>
					Try again
				</ToastAction>
			),
		});
	}

	const onChatModelChange = (value: LLMModel) => {
		setBody((e) => ({ ...e, model: value }));
	};

	const onChatTypeChange = (value: ChatType) => {
		setBody((e) => ({ ...e, chatType: value }));
		setShowFileUpload(value);
	};

	const onConversationStyleChange = (value: ConversationStyle) => {
		setBody((e) => ({ ...e, conversationStyle: value }));
	};

	const onHandleSubmit = (e: FormEvent<HTMLFormElement>) => {
		if (isLoading) {
			e.preventDefault();
			return;
		}

		handleSubmit(e);
	};

	const onHandleCancelSubmit = (e: any) => {
		stop();
	};

	const onFileChange = async (formData: FormData) => {
		try {
			setIsUploadingFile(true);
			formData.append("id", id);
			const { fileName, errorMessage } = await UploadDocument(formData);

			if (!errorMessage) {
				toast({
					title: "File upload",
					description: `${fileName} uploaded successfully.`,
				});
				setIsFileNull(false);
			} else {
				toast({
					variant: "destructive",
					description: "Error: " + errorMessage,
					duration: 15000
				});
				setIsFileNull(true);
			}
		} catch (error) {
			toast({
				variant: "destructive",
				description: "" + ((error as Error).cause ?? error),
				duration: 15000
			});
			setIsFileNull(true);
		} finally {
			setIsUploadingFile(false);
		}
	};

	const ChatWindow = (
		<div className=" h-full rounded-md overflow-y-auto" ref={scrollRef}>
			<div className="flex justify-center p-4">
				<ChatHeader
					chatType={chatBody.chatType}
					conversationStyle={chatBody.conversationStyle}
					llmModel={chatBody.model}
				/>
			</div>
			<div className=" pb-[80px] ">
				{messages.map((message, index) => (
					<ChatRow
						name={message.role === "user" ? session?.user?.name! : AI_NAME}
						profilePicture={
							message.role === "user" ? session?.user?.image! : (theme == "dark") ? "/CreativeGPTlogo-light.png" : "/CreativeGPTlogo-dark.png"
						}
						message={message.content}
						type={message.role}
						key={index}
					/>
				))}
				{isLoading && <ChatLoading />}
			</div>
		</div>
	);

	return (
		<Card className="h-full relative overflow-hidden">
			{messages.length !== 0 ? (
				ChatWindow
			) : (
				<div className=" h-full rounded-md overflow-y-auto">
					<div className=" pb-[80px] ">
						<EmptyState
							isUploadingFile={isUploadingFile}
							onFileChange={onFileChange}
							onLLMModelChange={onChatModelChange}
							onConversationStyleChange={onConversationStyleChange}
							onChatTypeChange={onChatTypeChange}
							chatType={chatBody.chatType}
							llmModel={chatBody.model}
							conversationStyle={chatBody.conversationStyle}
						/>
					</div>
				</div>
			)}
 

			<ChatInput
				isLoading={isLoading}
				value={input}
				disableSubmit={isFileNull && showFileUpload === "data"}
				handleInputChange={handleInputChange}
				handleSubmit={onHandleSubmit}
				handleCancelSubmit={onHandleCancelSubmit}
			/>
		</Card>
	);
};
