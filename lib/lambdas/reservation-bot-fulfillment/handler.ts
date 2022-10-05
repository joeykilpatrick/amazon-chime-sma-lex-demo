import type {LexV2Event, LexV2Result} from 'aws-lambda';

import { FulfillmentResponder } from './FulfillmentResponder';
import { ValidationResponder } from './ValidationResponder';

export async function handler(event: LexV2Event): Promise<LexV2Result> {
    console.log('event: ', JSON.stringify(event));

    const hook = event.invocationSource;

    console.log('hook: ', hook);

    const response = (() => {
        switch (hook) {
            case 'DialogCodeHook':
                return new ValidationResponder(event).respond();
            case 'FulfillmentCodeHook':
            default:
                return new FulfillmentResponder(event).respond();
        }
    })();

    console.log('response: ', JSON.stringify(response));

    return response;
}
