// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { ContactHR } = require('./componentDialogs/contactHR');
const { ContactITServices } = require('./componentDialogs/contactITServices');

const {LuisRecognizer, QnAMaker}  = require('botbuilder-ai');

const CHOICE_PROMPT    = 'CHOICE_PROMPT';

var configResultHeaderLiteral;
var numberOfresultsToShow;
var resultToBeShown = '';
var asteriskLine = "*************************************";
const peopleDept = "people";
const itServicesDept = "it services";

const chooseDomainIntent = "chooseDomain";
const askQuestionIntent = "askQuestion";
const cancelIntent = "cancelIntent";
const greetingIntent = "greetingIntent";
const noneIntent = "None";
const contactHRIntent = "contactHR";
const contactITServicesIntent = "contactITServices";
const doneIntent = "doneIntent";

var configMaxResults = 3;
var domainSelector = ["People", "IT Services", 'Cancel'];
var selectorITServices = ['Done', 'Contact IT Services', 'Ask another question'];
var selectorPeople = ['Done', 'Ask another question', 'Contact People'];

const greetingText = "Hello! I am ready to answer your query to the best of my ability. Please choose the department and ask a question...";
const chooseDepartmentText = "Sure. Please choose the department...";
const noResultText = "### Sorry, your search has yielded no result. Please try another search or contact ";
const byeText = "Bye now... just say Hello to wake me up again!";
const oneResultText = "# There is only one result: ";
const welcomeText = "Welcome to Taiho Buddy!! Please choose the department and ask a question";
const searchConfirmText1 = "Sure. Ask your question, we will search the " ;
const searchConfirmText2 = " Knowledge Base and get you the best results!" ;
const searchYieldText1 = "# Your search has yielded ";
const searchYieldText2 = " results: ";
const confidenceScoreText = "\n \n" + "**Confidence score:** "


class hrbot extends ActivityHandler {
    constructor(conversationState,userState) {
        super();
        console.log (userState)

        this.conversationState = conversationState;
        console.log ("**************usern state*************************")
        this.userState = userState;
        this.dialogState = conversationState.createProperty("dialogState");
        this.contactHRDialog = new ContactHR(this.conversationState,this.userState);
        this.contactITServicesDialog = new ContactITServices(this.conversationState,this.userState);
        
        
        this.previousIntent = this.conversationState.createProperty("previousIntent");
        this.conversationData = this.conversationState.createProperty('conservationData');        

        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: `https://${ process.env.LuisAPIHostName }.api.cognitive.microsoft.com`
        }, {
            includeAllIntents: true
        }, true);

       
        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAKnowledgebaseId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAEndpointHostName
        });

        const qnaMaker2 = new QnAMaker({
            knowledgeBaseId: process.env.QnAKnowledgebaseId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAEndpointHostName
        });
              
        this.qnaMaker = qnaMaker;
        this.qnaMaker2 = qnaMaker2;


        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            console.log ("In onMessage " )
            const luisResult = await dispatchRecognizer.recognize(context)
            const intent = LuisRecognizer.topIntent(luisResult);    
            const entities = luisResult.entities;
            await this.dispatchToIntentAsync(context,intent,entities);        
            await next();
        });

        this.onDialog(async (context, next) => {
            console.log ("In onDialog ")
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });   

        this.onMembersAdded(async (context, next) => {
            console.log ("In onMembersAdded " )
            await this.sendWelcomeMessage(context)
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

  

    async sendWelcomeMessage(turnContext) {
        const { activity } = turnContext;

        // Iterate over all new members added to the conversation.
        for (const idx in activity.membersAdded) {
            if (activity.membersAdded[idx].id !== activity.recipient.id) {
               // const welcomeMessage = `Welcome to People Buddy ${ activity.membersAdded[idx].name }. Please choose the department`;
                const welcomeMessage = welcomeText;
                await turnContext.sendActivity(welcomeMessage);
                await this.sendSuggestedActions(turnContext, domainSelector);
            }
        }
    }

    async sendSuggestedActions(turnContext, selector) {        
        var reply = MessageFactory.suggestedActions(selector);
        await turnContext.sendActivity(reply);
    }

    async dispatchToIntentAsync(context,intent,entities){
        console.log ("In dispatchToIntentAsync: " + intent)
        const conversationData = await this.conversationData.get(context,{}); 

        var currentIntent = '';
        var QnAMakerOptions = {
            top:3
        }
        if(intent == chooseDomainIntent ){
            console.log ("getting department...")
            var dept = entities.department[0]
            console.log ("Department chosen: "+ dept)
            await this.conversationData.set(context,{deptSaved: dept});
            await context.sendActivity(searchConfirmText1 + dept.toUpperCase() + searchConfirmText2);
        }
        if(intent == askQuestionIntent ){
            console.log ("in askQuestion intent");
            await context.sendActivity(chooseDepartmentText);          
            await this.sendSuggestedActions(context, domainSelector);
        }
        if(intent == greetingIntent ){
            console.log ("in greetingIntent intent");
            await context.sendActivity(greetingText);            
            await this.sendSuggestedActions(context, domainSelector);
        }

        if(intent == noneIntent ){
            console.log ("In none intent, calling QNA Maker")
            const conversationData = await this.conversationData.get(context,{});  
            console.log (conversationData.deptSaved)
            var selectorDialog;
            var result;
            if (conversationData.deptSaved === peopleDept){
                console.log("searching in People Knowledge Base")
                selectorDialog = selectorPeople
                result = await this.qnaMaker.getAnswers(context, QnAMakerOptions)
            }

            if (conversationData.deptSaved === itServicesDept){
                console.log("searching in IT Services Knowledge Base")
                selectorDialog = selectorITServices
                result = await this.qnaMaker.getAnswers(context, QnAMakerOptions)
            }

            console.log ("***************************************")
            console.log ("Number of rows returned: " + JSON.stringify(result.length))
            console.log ("***************************************")

            //Handle max results to show
            if (result.length > 0){
                var numberOffResultsReturned = result.length
                if (configMaxResults > numberOffResultsReturned){
                    numberOfresultsToShow  = numberOffResultsReturned
                } else{
                    numberOfresultsToShow = configMaxResults
                }
                if (numberOfresultsToShow === 1){
                    configResultHeaderLiteral = oneResultText;
    
                } else{
                    configResultHeaderLiteral = searchYieldText1 + numberOfresultsToShow + searchYieldText2
                }
                

                console.log("configMaxResults      " + configMaxResults)
                console.log("numberOffResultsReturned " + numberOffResultsReturned)
                console.log("numberOfresultsToShow " + numberOfresultsToShow)
            }

            if (result.length > 0){
                
                resultToBeShown = ''
                for (var i=0; i<numberOfresultsToShow; i++){
                    var score = (Math.round(result[i].score * 100) / 100).toFixed(2);
                    var resultnumber = "## Result [" + (i+1) + "]"
                    resultToBeShown =  resultToBeShown + "\n \n" + resultnumber + "\n \n" + result[i].answer + confidenceScoreText + score + "\n \n" +  "**Source:** "  + result[i].source   + "\n \n" + asteriskLine
                }
                await context.sendActivity(configResultHeaderLiteral + "\n \n" + asteriskLine + "\n \n" + resultToBeShown);

            }  else{
                await context.sendActivity(noResultText + conversationData.deptSaved.toUpperCase() + " department");
            }
                        
            await this.sendSuggestedActions(context, selectorDialog);
        }
        else
        {
            currentIntent = intent;
            console.log ("currentIntent here, yet to decide department: " + currentIntent)
            const conversationData = await this.conversationData.get(context,{});  
            console.log ("contactPeopleDone " + conversationData.contactPeopleDone)

            if (conversationData.contactPeopleDone === false){
                console.log ("Forcing intent to stick to conversation")
                currentIntent = contactHRIntent
            }
            if (currentIntent === contactHRIntent){
                console.log ("In contactHR intent")
                await this.conversationData.set(context,{endDialog: false});
                console.log ("setting contactPeopleDone to false")
                await this.conversationData.set(context,{contactPeopleDone: false});                
                await this.contactHRDialog.run(context,this.dialogState,entities);
                conversationData.endDialog = await this.contactHRDialog.isDialogComplete();
                console.log (conversationData.endDialog);
            } else

            if (currentIntent === contactITServicesIntent){
                console.log ("In intent contactITServices")
                await this.conversationData.set(context,{endDialog: false});
                console.log ("setting contactITServicesDone to false")
                await this.conversationData.set(context,{contactITServicesDone: false});
                await this.contactITServicesDialog.run(context,this.dialogState,entities);
                conversationData.endDialog = await this.contactITServicesDialog.isDialogComplete();
                if(conversationData.endDialog)
                {
                    await this.previousIntent.set(context,{intentName: null}); 
                } 

            }
            if  ((intent == doneIntent) || (intent == cancelIntent)){
                console.log ("In done  / cancel intent " + JSON.stringify(intent))
                await context.sendActivity(byeText);
                
            }

        }
    
    }
}



module.exports.hrbot = hrbot;
