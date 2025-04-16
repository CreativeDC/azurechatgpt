import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FC } from "react";
import { LLMModel, GPT_3_5, GPT_4, GPT_4_32K, GPT_4_1 } from "../chat-services/models";

interface Prop {
	disable: boolean;
	llmModel: LLMModel;
	onLLMModelChange?: (value: LLMModel) => void;
}

export const ChatModelSelector: FC<Prop> = (props) => {
	return (
		<Tabs
			defaultValue={props.llmModel}
			onValueChange={(value) =>
				props.onLLMModelChange
					? props.onLLMModelChange(value as LLMModel)
					: null
			}
		>
			<TabsList className="grid w-full grid-cols-1 h-12 items-stretch">

				<TabsTrigger value={GPT_4_1} disabled={props.disable}>
					GPT-4.1 💎
				</TabsTrigger>
			</TabsList>
		</Tabs>
	);
};
