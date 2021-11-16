const {WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { ActivityHandler, MessageFactory } = require('botbuilder');

const {ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt  } = require('botbuilder-dialogs');

const {DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');


const CHOICE_PROMPT    = 'CHOICE_PROMPT';
const CONFIRM_PROMPT   = 'CONFIRM_PROMPT';
const TEXT_PROMPT      = 'TEXT_PROMPT';
const NUMBER_PROMPT    = 'NUMBER_PROMPT';
const DATETIME_PROMPT  = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog ='';
var domainSelector = ["People", "IT Services", 'Cancel'];
var problemAreaPeople = ["Benefits", "Covid", "Training", "Vacation", "Cancel"];
var problemBriefOptions= ["Results not useful", "Need more info", "No Results", "Timed out", "Cancel"];
const problemAreaText = "What is the area in which you have raised a query?";
const problemBriefText = "What is the problem brief?";

class ContactHR extends ComponentDialog {
    
    constructor(conversationState,userState) {
        super('contactHR');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT,this.noOfParticipantsValidator));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.conversationState = conversationState;
        this.conversationData = this.conversationState.createProperty('conservationData');

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.getProblemArea.bind(this),  // Get getProblemArea           
            this.getProblemBrief.bind(this),    // Get getProblemBrief
            this.sendEmail.bind(this),    // send Email            
        ]));

        this.initialDialogId = WATERFALL_DIALOG;

   }

    async run(turnContext, accessor, entities) {
        console.log ("in run...")
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        
        const results = await dialogContext.continueDialog();
       
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id, entities);
        }
    }

    async getProblemArea(step) {
        console.log ("In getProblemArea");
        step.values.contactPeopleDone = false  
        endDialog = false;
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        return await step.prompt(CHOICE_PROMPT, problemAreaText, problemAreaPeople);
           
    }

    async getProblemBrief(step){
        console.log ("In getProblemBrief")  
        step.values.contactPeopleDone = false      
        step.values.probArea = step.result.value
        return await step.prompt(CHOICE_PROMPT, problemBriefText, problemBriefOptions);        
    }

    async sendEmail(step){
        console.log ("In sendEmail") 
        console.log (step.values.probArea)
        var probBrief = step.result.value;
        await step.context.sendActivity("### Problem Area: " + step.values.probArea + " ,  Problem brief: " + probBrief + " \n \n eMail sent to People Team. You can continue with your search...")
        await this.sendSuggestedActions(step.context, domainSelector);
        step.values.contactPeopleDone = true  
        endDialog = true;
        return await step.endDialog();   
    
    }
    async sendSuggestedActions(turnContext, selector) {
        var reply = MessageFactory.suggestedActions(selector);
        await turnContext.sendActivity(reply);
    }



    async isDialogComplete(){
        return endDialog;
    }
}

module.exports.ContactHR = ContactHR;








