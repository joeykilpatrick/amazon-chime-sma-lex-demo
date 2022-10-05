#!/usr/bin/env node
import * as CDK from "aws-cdk-lib";
import {IsString} from "class-validator";
import {transformAndValidateSync} from "class-transformer-validator";

import { Stack } from '../lib/Stack';

export class Environment {

    @IsString()
    CDK_DEFAULT_ACCOUNT!: string;

    @IsString()
    CDK_DEFAULT_REGION!: string;

}

const environment: Environment = transformAndValidateSync(Environment, process.env);

const app = new CDK.App();

const projectName: string = 'chime-sma-lex-demo';

new Stack(app, projectName, {
    env: {
        account: environment.CDK_DEFAULT_ACCOUNT,
        region: environment.CDK_DEFAULT_REGION,
    },
});
