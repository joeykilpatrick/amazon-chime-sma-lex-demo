import type {LexV2Event, LexV2Result} from 'aws-lambda';

export abstract class LexResponder {

    protected sessionAttributes: Record<string, string>;

    protected constructor(
        protected event: LexV2Event,
    ) {
        this.sessionAttributes = event.sessionState.sessionAttributes || {};
    }

    get interpretation() {
        return this.event.interpretations.find((interpretation) => interpretation.intent.name === "GetWaitTime") || this.event.interpretations[0]!;
    }

    get slots() {
        return this.interpretation.intent.slots;
    }

    get intentName(): string {
        return this.interpretation.intent.name;
    }

    abstract respond(): LexV2Result;

    protected delegate(): LexV2Result {
        return {
            sessionState: {
                intent: this.event.sessionState.intent,
                sessionAttributes: this.sessionAttributes,
                dialogAction: {
                    type: "Delegate",
                }
            }
        }
    }

    protected elicitSlot(slotToElicit: string, message: string): LexV2Result {
        return {
            sessionState: {
                sessionAttributes: this.sessionAttributes,
                // @ts-ignore Additional field causing error
                dialogAction: {
                    type: "ElicitSlot",
                    slotToElicit,
                    // slotElicitationStyle: "Default",
                },
                intent: {
                    state: "InProgress",
                    name: this.intentName,
                    slots: this.slots,
                },
            },
            messages: [
                {
                    contentType: "PlainText",
                    content: message,
                },
            ],
        };
    };

    protected fulfilledResponse(message: string, ssml: boolean = false): LexV2Result {
        return {
            sessionState: {
                sessionAttributes: this.sessionAttributes,
                dialogAction: {
                    type: "Close",
                },
                intent: {
                    slots: this.slots,
                    name: this.intentName,
                    state: "Fulfilled",
                },
            },
            messages: [
                {
                    contentType: ssml ? "SSML" : "PlainText",
                    content: message,
                },
            ],
        };
    }

    protected failedResponse(message: string): LexV2Result {
        return {
            sessionState: {
                sessionAttributes: this.sessionAttributes,
                dialogAction: {
                    type: "Close",
                },
                intent: {
                    slots: this.slots,
                    name: this.intentName,
                    state: "Failed",
                },
            },
            messages: [
                {
                    contentType: "PlainText",
                    content: message,
                },
            ],
        };
    }
}
