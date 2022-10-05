#!/usr/bin/env node
import * as CDK from "aws-cdk-lib";

import { Stack } from '../lib/Stack';

const app = new CDK.App();

const projectName: string = 'amazon-chime-sma-lex-demo';

new Stack(app, projectName, {});
