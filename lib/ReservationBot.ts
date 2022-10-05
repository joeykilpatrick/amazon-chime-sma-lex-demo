import * as CDK from 'aws-cdk-lib';
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as Lex from 'aws-cdk-lib/aws-lex';
import * as S3Assets from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';

export class ReservationBot extends Construct {

    public readonly bot: Lex.CfnBot;
    public readonly botAlias: Lex.CfnBotAlias;

    constructor(
        scope: Construct,
        id: string,
    ) {
        super(scope, id);

        const accountId: string = CDK.Stack.of(this).account;
        const region: string = CDK.Stack.of(this).region;

        const fulfillmentLambdaName = `${id}-reservation-bot-fulfillment`;
        const fulfillmentLambda = new Lambda.Function(this, fulfillmentLambdaName, {
            functionName: fulfillmentLambdaName,
            runtime: Lambda.Runtime.NODEJS_16_X,
            code: Lambda.Code.fromAsset('./build/reservation-bot-fulfillment.zip'),
            handler: "handler.handler"
        });

        fulfillmentLambda.addPermission(`${id}-lex-permission`, {
            principal: new IAM.ServicePrincipal('lex.amazonaws.com'),
            action: 'lambda:InvokeFunction',
        });

        const lexRuntimeRole = new IAM.Role(this, `${id}LexRuntimeRole`, {
            roleName: `${id}LexRuntimeRole`,
            assumedBy: new IAM.ServicePrincipal("lexv2.amazonaws.com"),
        });
        lexRuntimeRole.addToPolicy(
            new IAM.PolicyStatement({
                actions: [
                    "polly:SynthesizeSpeech",
                    "comprehend:DetectSentiment",
                    "lambda:invokeFunction"
                ],
                effect: IAM.Effect.ALLOW,
                resources: ["*"],
            })
        );

        const botAsset = new S3Assets.Asset(this, `${id}-bot-asset`, {
            path: './build/reservation-bot.zip',
        });

        this.bot = new Lex.CfnBot(this, `${id}-bot`, {
            dataPrivacy: {
                ChildDirected: false
            },
            idleSessionTtlInSeconds: 123,
            name: `reservation-bot`,
            roleArn: lexRuntimeRole.roleArn,
            autoBuildBotLocales: true,
            botFileS3Location: {
                s3Bucket: botAsset.s3BucketName,
                s3ObjectKey: botAsset.s3ObjectKey,
            }
        });

        const botVersion = new Lex.CfnBotVersion(this, `${id}-bot-version`, {
            botId: this.bot.attrId,
            botVersionLocaleSpecification: [
                {
                    botVersionLocaleDetails: {
                        sourceBotVersion: 'DRAFT',
                    },
                    localeId: 'en_US',
                }
            ]
        })

        this.botAlias = new Lex.CfnBotAlias(this, `${id}-bot-alias`, {
            botAliasName: "LIVE",
            botId: this.bot.attrId,
            botVersion: botVersion.attrBotVersion,
            botAliasLocaleSettings: [
                {
                    botAliasLocaleSetting: {
                        codeHookSpecification: {
                            lambdaCodeHook: {
                                codeHookInterfaceVersion: '1.0',
                                lambdaArn: fulfillmentLambda.functionArn,
                            }
                        },
                        enabled: true,
                    },
                    localeId: 'en_US'
                }
            ]
        })

        new Lex.CfnResourcePolicy(this, `${id}-bot-resource-policy`, {
            policy: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Principal: {
                            Service: "voiceconnector.chime.amazonaws.com"
                        },
                        Action: "lex:StartConversation",
                        Resource: this.botAlias.attrArn,
                        Condition: {
                            StringEquals: {
                                "AWS:SourceAccount": accountId
                            },
                            ArnEquals: {
                                "AWS:SourceArn": `arn:aws:voiceconnector:${region}:${accountId}:sma/*`
                            }
                        }
                    }
                ],
            },
            resourceArn: this.botAlias.attrArn,
        });
    }

}
