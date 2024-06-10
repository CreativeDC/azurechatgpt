import ChatRow from "@/components/chat/chat-row";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FC } from "react";
import { AI_NAME } from "../theme/customise";
import { FindAllChatsInThread, FindChatThreadByID } from "./reporting-service";
import { GPT_3_5, GPT_4, GPT_4_32K } from "../chat/chat-services/models";

interface Props {
	chatId: string;
}

export const ChatReportingUI: FC<Props> = async (props) => {
	const chatThreads = await FindChatThreadByID(props.chatId);
	const chats = await FindAllChatsInThread(props.chatId);
	const chatThread = chatThreads[0];

	return (
		<Card className="h-full relative">
			<div className="h-full rounded-md overflow-y-auto">
				<div className="flex justify-center p-4">
					<Tabs defaultValue={chatThread.model}>
						<TabsList className="grid w-full grid-cols-1 h-12 items-stretch">

							<TabsTrigger disabled={true} value={GPT_4}>
								GPT-4 💎
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
				<div className=" pb-[80px] ">
					{chats.map((message, index) => (
						<ChatRow
							name={message.role === "user" ? chatThread.userName : AI_NAME}
							profilePicture={message.role === "user" ? "" : "/ai-icon.png"}
							message={message.content}
							type={message.role}
							key={index}
						/>
					))}
				</div>
			</div>
		</Card>
	);
};
