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

class ContactITServices extends ComponentDialog {
    
    constructor(conservsationState,userState) {
        super('contactITServices');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT,this.noOfParticipantsValidator));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.getProblemArea.bind(this),  // Get getProblemArea
            this.getProblemBrief.bind(this),    // Get getProblemBrief
            this.sendEmail.bind(this),    // send Email            
        ]));

        this.initialDialogId = WATERFALL_DIALOG;

   }

    async run(turnContext, accessor, entities) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id, entities);
        }
    }

    async getProblemArea(step) {
        console.log ("In getProblemArea")

        var problemArea = ["Equipment", "Policies", "Access Related", "Software", "Cancel"]

        endDialog = false;
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        return await step.prompt(CHOICE_PROMPT, 'What is the area in which you have raised a query?', problemArea);
           
    }

    async getProblemBrief(step){
        console.log ("In getProblemBrief")        
       // console.log(step.result)
        step.values.probArea = step.result.value
        
        var problemBrief= ["Results not useful", "Need more info", "No Results", "Timed out", "Cancel"]

        return await step.prompt(CHOICE_PROMPT, 'What is the problem brief?', problemBrief);
        
        
    }

    async sendEmail(step){
        console.log ("In sendEmail") 
        console.log (step.values.probArea)
        var probBrief = step.result.value

        await step.context.sendActivity("### Problem Area: " + step.values.probArea + " ,  Problem brief: " + probBrief + " \n \n eMail sent to IT Services Team. You can continue with your search...")
        await this.sendSuggestedActions7(step.context);
        endDialog = true;
        return await step.endDialog();   
    
    }


    async sendSuggestedActions7(turnContext) {
        var reply = MessageFactory.suggestedActions(['People', 'IT Services', 'Not sure', 'Cancel']);
        await turnContext.sendActivity(reply);
    }

    async isDialogComplete(){
        return endDialog;
    }
}

module.exports.ContactITServices = ContactITServices;








