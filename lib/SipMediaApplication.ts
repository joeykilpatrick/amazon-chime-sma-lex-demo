import * as CDK from 'aws-cdk-lib';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as Chime from 'cdk-amazon-chime-resources';
import { Construct } from 'constructs';

import {SmaEndpointEnvironment} from "./lambdas/sma-endpoint-environment";

export interface SmaProps {
    lambdaCode: Lambda.Code,
    lambdaEnvironmentVariables?: Record<string, string>,
}

export class SipMediaApplication extends Construct {

    public phoneNumber: `+${number}`;

    constructor(scope: Construct, id: string, props: SmaProps) {
        super(scope, id);

        const chimePhoneNumber = new Chime.ChimePhoneNumber(this, `${id}-phone-number`, {
            phoneNumberType: Chime.PhoneNumberType.TOLLFREE,
            phoneNumberTollFreePrefix: 833,
            phoneProductType: Chime.PhoneProductType.SMA,
        });
        this.phoneNumber = chimePhoneNumber.phoneNumber as `+${number}`; // Assertion okay, format is consistent

        const environment: Omit<SmaEndpointEnvironment, 'AWS_REGION'> = {
            ...props.lambdaEnvironmentVariables,
            SMA_PHONE_NUMBER: this.phoneNumber,
        }

        const endpoint = new Lambda.Function(scope, `${id}-sma-endpoint`, {
            handler: 'handler.handler',
            code: props.lambdaCode,
            functionName: `${id}-sma-endpoint`,
            runtime: Lambda.Runtime.NODEJS_14_X,
            timeout: CDK.Duration.seconds(30),
            environment
        });

        const sma = new Chime.ChimeSipMediaApp(this, `${id}-sip-media-app`, {
            endpoint: endpoint.functionArn,
        });

        new Chime.ChimeSipRule(this, `${id}-sip-rule`, {
            triggerType: Chime.TriggerType.TO_PHONE_NUMBER,
            triggerValue: chimePhoneNumber.phoneNumber,
            targetApplications: [
                {
                    priority: 1,
                    sipMediaApplicationId: sma.sipMediaAppId,
                },
            ],
        });
    }

}
