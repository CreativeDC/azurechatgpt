"use client";

import Typography from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowUpCircle, Loader2 } from "lucide-react";
import { FC, useState } from "react";
import { ChatType, ConversationStyle, LLMModel } from "../chat-services/models";
import { ChatModelSelector } from "./chat-model-selector";
import { ChatStyleSelector } from "./chat-style-selector";
import { ChatTypeSelector } from "./chat-type-selector";
import { AI_NAME } from "@/features/theme/customise";
import Image from "next/image";
import {useTheme} from "next-themes";

interface Prop {
  isUploadingFile: boolean;
  llmModel: LLMModel;
  chatType: ChatType;
  conversationStyle: ConversationStyle;
  onChatTypeChange: (value: ChatType) => void;
  onConversationStyleChange: (value: ConversationStyle) => void;
  onLLMModelChange: (value: LLMModel) => void;
  onFileChange: (file: FormData) => void;
}

export const EmptyState: FC<Prop> = (props) => {
  const { theme, setTheme } = useTheme();
  const [showFileUpload, setShowFileUpload] = useState<ChatType>("simple");
  const [isFileNull, setIsFileNull] = useState(true);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    props.onFileChange(formData);
  };

  const onChatTypeChange = (value: ChatType) => {
    setShowFileUpload(value);
    setIsFileNull(true);
    props.onChatTypeChange(value);
  };

  return (

    <div className="grid grid-cols-5 w-full items-center container mx-auto max-w-3xl justify-center h-full gap-9">
       <div className="col-span-5 flex flex-col items-center gap-5">
        <div className="flex justify-center">
          <Image src={(theme == "dark") ? "/CreativeGPTlogo-light.png" : "/CreativeGPTlogo-dark.png"} width={200} height={200} alt="Logo" />
        </div>
        <div className="col-span-5 flex flex-col gap-5 p-5 ">
          <Typography variant="h4" className="text-primary">
            Welcome!
          </Typography>
          <p className="">
            Welcome to {AI_NAME} - the friendly chatbot from Creative IT! Start by  typing your message in the box below. You can also
            personalize the chat by making changes to the settings shown below.
          </p>
          <p className="">
            {AI_NAME} users are requried to read and accept Creative's AI Guidance. <a className="text-link hover:text-link-hover" href="https://creativedc.sharepoint.com/:w:/r/sites/OPO/_layouts/15/Doc.aspx?sourcedoc=%7B8DDE5637-5740-4A65-B55C-2D7E47CC438F%7D&file=Updated%20Draft%20Guidance_Generative%20AI%20Use%20at%20Creative.docx&action=default&mobileredirect=true" target="_blank">Click here</a> to access the guidance.
          </p>
        </div>
      
      <Card className="col-span-5 flex flex-col gap-5 p-5 w-full">
        <Typography variant="h4" className="text-primary">
          Personalize
        </Typography>
        <div className="flex flex-col gap-2">
          <p className="text-sm ">Select the Azure OpenAI model</p>
          <ChatModelSelector
            disable={false}
            llmModel={props.llmModel}
            onLLMModelChange={props.onLLMModelChange}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Choose a conversation style
          </p>
          <ChatStyleSelector
            conversationStyle={props.conversationStyle}
            onChatStyleChange={props.onConversationStyleChange}
            disable={false}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            How would you like to chat?
          </p>
          <ChatTypeSelector
            chatType={props.chatType}
            onChatTypeChange={onChatTypeChange}
            disable={false}
          />
        </div>
        {showFileUpload === "data" && (
          <div className="flex flex-col gap-2">
            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                name="file"
                type="file"
                required
                disabled={props.isUploadingFile}
                placeholder="Describe the purpose of the document"
                onChange={(e) => {setIsFileNull(e.currentTarget.value === null)}}
              />
              <Button
                type="submit"
                value="Upload"
                disabled={!(!isFileNull && !props.isUploadingFile)}
                className="flex items-center gap-1"
              >
                {props.isUploadingFile ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <ArrowUpCircle size={20} />
                )}
                Upload
              </Button>
            </form>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
};
