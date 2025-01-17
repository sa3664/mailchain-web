import { Component, OnInit, Output, Input, EventEmitter, ViewChild } from '@angular/core';
import { Mail } from 'src/app/models/mail';
import { OutboundMail } from 'src/app/models/outbound-mail';
import { MailchainService } from 'src/app/services/mailchain/mailchain.service';
import { SendService } from 'src/app/services/mailchain/messages/send.service';
import { PublicKeyService } from 'src/app/services/mailchain/public-key/public-key.service';
import { AddressesService } from 'src/app/services/mailchain/addresses/addresses.service';
import { EnvelopeService } from 'src/app/services/mailchain/envelope/envelope.service';
import { NameserviceService } from 'src/app/services/mailchain/nameservice/nameservice.service';
import { BalanceService } from 'src/app/services/mailchain/addresses/balance.service';

import { Subject, of, Observable } from 'rxjs';

import { debounceTime, distinctUntilChanged, mergeMap } from "rxjs/operators";
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ModalConnectivityErrorComponent } from 'src/app/modals/modal-connectivity-error/modal-connectivity-error.component';

import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import { getCurrencySymbol } from '@angular/common';

@Component({
  selector: '[inbox-compose]',
  templateUrl: './inbox-compose.component.html',
  styleUrls: ['./inbox-compose.component.scss']
})

export class InboxComposeComponent implements OnInit {
  @Input() currentAccount: string;
  @Input() currentNetwork: string;
  @Input() currentProtocol: string;
  @Input() currentMessage: any;

  @Output() openMessage = new EventEmitter();
  @Output() goToInboxMessages = new EventEmitter();

  public model = new Mail()
  public fromAddresses: Array<any> = []
  public envelopes: Array<any> = []
  public balance: number = 0
  public currency: string = ""
  public fees: string = ""

  public sendMessagesDisabled: boolean = false;
  private subscription
  public currentRecipientValue

  public recipientAddressChanged = new Subject<string>();
  public recipientLoadingIcon = ""
  public recipientLoadingText = ""
  public messageToField = ""

  public errorTitle: string = ""
  public errorMessage: string = ""
  public modalConnectivityError: BsModalRef;

  public Editor = ClassicEditor;
  public inputContentType = "html"
  public contentTypeSwitchLabel: string = ""
  public envelopeType
  public envelopeDescription
  public isReply: boolean = false

  @ViewChild('editor') public editorComponent: CKEditorComponent;

  constructor(
    private mailchainService: MailchainService,
    private sendService: SendService,
    private publicKeyService: PublicKeyService,
    private addressesService: AddressesService,
    private envelopeService: EnvelopeService,
    private nameserviceService: NameserviceService,
    private balanceService: BalanceService,
    private modalService: BsModalService,
  ) {
    this.initMail()
  }

  /**
   * Initialize empty values for the message model
   */
  private initMail() {
    this.model.to = ""
    this.model.from = ""
    this.model.replyTo = ""
    this.model.subject = ""
    this.model.body = ""

  }

  /**
   * initEditor - initiates CKeditor
   */
  private initEditor() {
    let editor = this.editorComponent.editorInstance

    // Enable nested blockquotes
    if (editor && editor.model && editor.model.schema) {
      editor.model.schema.on('checkChild', (evt, args) => {
        const context = args[0];
        const childDefinition = args[1];
        if (context.endsWith('blockQuote') && childDefinition.name == 'blockQuote') {
          // Prevent next listeners from being called.
          evt.stop();
          // Set the checkChild()'s return value.
          evt.return = true;
        }
      }, { priority: 'highest' });
    };

    // Put CKeditor in focus 
    if (editor && editor.editing) {
      editor.editing.view.focus()
    }
  }

  /**
   * Sets the available 'from' addresses
   */
  private async setFromAddressList() {
    this.fromAddresses = await this.addressesService.getAddresses(this.currentProtocol, this.currentNetwork);
  }

  /**
   * Sets the available envelopes
   */
  private async setEnvelopeList() {
    this.envelopes = await this.envelopeService.getEnvelope();
  }


  /**
   * updates the balance whenver address dropdwon value is changed
   */

  public async updateBalanceForAddress(address) {
    this.balance = await this.balanceService.getBalance(address, this.currentProtocol, this.currentNetwork);

  }

  private async setBalance() {
    if (this.currentAccount != undefined) {

      this.balance = await this.balanceService.getBalance(this.currentAccount, this.currentProtocol, this.currentNetwork);
    }
  }

  /**
   * Sets the currency
   */
  private async setCurrency() {
    this.currency = await this.mailchainService.getCurrencyForProtocol(this.currentProtocol)
  }



  /**
   * Returns the identicon for the an address
   * @param address the address 
   */
  public generateIdenticon(address) {
    let icon = this.mailchainService.generateIdenticon(this.currentProtocol, address);

    return icon == "" ? "assets/question-circle-regular.svg" : icon
  }

  /**
   * Resolves the recipient field to ENS address
   * (or validates public address).
   * Leverages debounce (in case of user still typing).
   *  
   * @param event the event from keyup
   */
  public recipientResolve(event) {
    let eventVal = event.target.value.trim();
    if (eventVal == "") {
      this.setRecipientLoadingIcon("clear")
      this.setRecipientLoadingText()
      this.resetModelToField()
    } else if (this.currentRecipientValue != eventVal) {
      this.setRecipientLoadingIcon("loading")
      this.setRecipientLoadingText()
      this.resetModelToField()
    }
    this.currentRecipientValue = eventVal
    this.recipientAddressChanged.next(eventVal);

  }

  /**
   * Sets the recipientLoadingIcon to the following:
   * loading: spinner
   * valid:   tick
   * invalid: cross
   * clear:   blank
   * @param status ['loading' | 'valid' | 'invalid' | 'clear' ]
   */
  public setRecipientLoadingIcon(status) {
    switch (status) {
      case 'loading':
        this.recipientLoadingIcon = "fa fa-spinner fa-pulse"
        break;
      case 'valid':
        this.recipientLoadingIcon = "fa fa-check-circle text-success"
        break;
      case 'invalid':
        this.recipientLoadingIcon = "fa fa-times-circle text-danger"
        break;
      case 'clear':
        this.recipientLoadingIcon = ""
        break;
    }
  }

  /**
   * Sets the recipientLoadingText to the input text
   * @param text the text to display; if blank, clears text
   */
  public setRecipientLoadingText(text: string = "") {
    this.recipientLoadingText = text
  }

  /**
   * Sets up a subscription to handle user entering an ENS name or Ethereum address in the To field.
   * Includes debounce handling and will validate a name or address.
   */
  private setupRecipientAddressLookupSubscription() {
    this.subscription = this.recipientAddressChanged.pipe(
      debounceTime(1500),
      distinctUntilChanged(),
      mergeMap(searchVal => {
        return this.resolveAddress(searchVal)
      })
    ).subscribe((res) => {
      res.subscribe(val => {
        let address = val['body']['address']
        if (
          (this.currentProtocol == 'algorand' && this.mailchainService.validateAlgorandAddress(address)) ||
          (this.currentProtocol == 'ethereum' && this.mailchainService.validateEthAddress(address)) ||
          (this.currentProtocol == 'substrate' && this.mailchainService.validateSubstrateAddress(address))
        ) {
          this.model.to = address
          this.setRecipientLoadingIcon('valid')
          this.setRecipientLoadingText('valid address')
        } else {
          this.setRecipientLoadingIcon('invalid')
          this.setRecipientLoadingText('invalid address')
        }
      }, err => {
        this.setRecipientLoadingIcon('invalid')
        this.setRecipientLoadingText(err['error']['message'])
      })
    })
  };

  /**
   * resetModelToField resets the to field in the model
   */
  public resetModelToField() {
    this.model.to = ""
  }

  /**
   * resetModelReplyToField resets the reply-to field in the model
   */
  public resetModelReplyToField() {
    this.model.replyTo = ""
  }

  /**
   * Determines whether an address is:
   * * a public address,
   * * an ENS address
   * 
   * Returns observable with body containing address, e,g.
   * {body: {address: "0x1234567891234567891234567891234567891234"} }
   */
  public async resolveAddress(value) {
    let returnObs

    if (this.currentProtocol == 'ethereum') {
      if (this.mailchainService.validateEnsName(value)) {
        returnObs = await this.nameserviceService.resolveName(
          this.currentProtocol,
          this.currentNetwork,
          value
        )
      } else if (this.mailchainService.validateEthAddress(value)) {
        returnObs = of(
          { body: { address: value } }
        )
      } else {
        returnObs = of(
          { body: { address: '' } }
        )
      }
    } else if (this.currentProtocol == 'substrate') {
      if (this.mailchainService.validateSubstrateAddress(value)) {
        returnObs = of(
          { body: { address: value } }
        )
      } else {
        returnObs = of(
          { body: { address: '' } }
        )
      }
    } else if (this.currentProtocol == 'algorand') {
      if (this.mailchainService.validateAlgorandAddress(value)) {
        returnObs = of(
          { body: { address: value } }
        )
      } else {
        returnObs = of(
          { body: { address: '' } }
        )
      }
    } else { // return the address anyway
      returnObs = of(
        { body: { address: value } }
      )
    };

    return returnObs

  }

  /**
   * Go back to the inbox-messages view
   */
  public returnToInboxMessages(): void {
    this.goToInboxMessages.emit('');
  }

  /**
   * If there is a currentMessage, call the openMessage.emit to go back to the inbox-messages view; Otherwise, call the functin to return to inbox view
   */
  public returnToMessage(): void {
    if (this.currentMessage == undefined) {
      this.returnToInboxMessages();
    } else {
      this.openMessage.emit(this.currentMessage);
    }
  }

  /**
   * Surpress propagation of events to extensions etc.
   */
  public supressEnterPropagation($event: KeyboardEvent): void {
    $event.stopPropagation()
  }

  /**
   * Sets the currentAccount as the address in the `from` dropdown
   * -or-
   * When replying, sets the from address as the address the message was sent to
   */
  private setCurrentAccountInFromAddressDropdown() {
    if (this.currentAccount != undefined) {
      this.model.replyTo = this.model.from = this.currentAccount
    }
  }

  /**
 * Sets the envelope in the `envelope` dropdown
 * By default takes the first value returned from the /envelop endpoint
 */
  private setFirstEnvelopeInEnvelopeDropdown() {
    if (this.envelopes != undefined) {
      this.envelopeType = this.envelopes[0]["type"]
      this.envelopeDescription = this.envelopes[0]["description"]
    }
  }

  /**
   * Initialise the message.
   * If it's a new message, fields will be blank.
   * -or-
   * If it's a reply, the correct fields are mapped to build the response.
   */
  async ngOnInit(): Promise<void> {
    await this.setFromAddressList()
    await this.setEnvelopeList()
    this.setContentTypeForView()
    this.initEditor()
    this.setCurrentAccountInFromAddressDropdown()
    this.setFirstEnvelopeInEnvelopeDropdown()
    this.evaluateReply()
    this.handleReplyFields()
    this.setupRecipientAddressLookupSubscription()
    await this.setBalance()
    await this.setCurrency()
  }

  /**
   * Handles content-type in the view
   */
  private setContentTypeForView() {
    if (this.currentMessage) {
      let ct = this.currentMessage.headers["content-type"]
      this.inputContentType = this.mailchainService.getContentTypeForView(ct)
    }

    this.contentTypeSwitchLabel = this.setContentTypeSwitchLabel()
  }

  /**
   * handleReplyInPlaintext prepares message fields for a plaintext reply based on the currentMessage
   */
  private handleReplyInPlaintext() {
    var messageFrom: string = "",
      messageReplyTo: string = "",
      messageDate: string = "",
      messageTo: string = "",
      messageSubject: string = "",
      messageBody: string = ""

    if (this.currentMessage.headers["from"]) {
      messageFrom = '\r\n\r\n>From: ' + this.currentMessage.headers["from"] + "\r\n"
    }
    if (this.currentMessage.headers["reply-to"]) {
      messageReplyTo = '>Reply To: ' + this.currentMessage.headers["reply-to"] + "\r\n"
    }
    if (this.currentMessage.headers["date"]) {
      messageDate = '>Date: ' + this.currentMessage.headers["date"] + "\r\n"
    }
    if (this.currentMessage.headers["to"]) {
      messageTo = '>To: ' + this.currentMessage.headers["to"] + "\r\n"
    }
    if (this.currentMessage["subject"]) {
      messageSubject = '>Subject: ' + this.currentMessage["subject"] + "\r\n" + ">" + "\r\n"
    } else {
      messageSubject = ""
    }
    if (this.currentMessage["body"]) {
      messageBody = '>' + this.currentMessage["body"]
    }

    messageBody = messageBody.replace(/\r\n/g, '\r\n>');

    this.model.body = messageFrom +
      messageReplyTo +
      messageDate +
      messageTo +
      messageSubject +
      messageBody
  }

  /**
   * handleReplyInHtml prepares message fields for a html reply based on the currentMessage
   */
  private handleReplyInHtml() {
    var messageFrom: string = "",
      messageReplyTo: string = "",
      messageDate: string = "",
      messageTo: string = "",
      messageSubject: string = "",
      messageBody: string = ""

    if (this.currentMessage.headers["from"]) {
      messageFrom = '<strong>From:</strong> ' + this.currentMessage.headers["from"] + "<br>"
    }
    if (this.currentMessage.headers["reply-to"]) {
      messageReplyTo = '<strong>Reply To:</strong> ' + this.currentMessage.headers["reply-to"] + "<br>"
    }
    if (this.currentMessage.headers["date"]) {
      messageDate = '<strong>Date:</strong> ' + this.currentMessage.headers["date"] + "<br>"
    }
    if (this.currentMessage.headers["to"]) {
      messageTo = '<strong>To:</strong> ' + this.currentMessage.headers["to"] + "<br>"
    }
    if (this.currentMessage["subject"]) {
      messageSubject = '<strong>Subject:</strong> ' + this.currentMessage["subject"]
    } else {
      messageSubject = ""
    }
    if (this.currentMessage["body"]) {
      messageBody = '<blockquote>' + this.currentMessage["body"] + '<br></blockquote>'
    }

    this.model.body = "<p></p><p>" +
      messageFrom +
      messageReplyTo +
      messageDate +
      messageTo +
      messageSubject +
      "</p>" +
      messageBody
  }

  /**
   * Evalute if the message is a reply or a new message
   */
  evaluateReply() {
    this.isReply = (this.currentMessage && this.currentMessage.headers) ? true : false
  }

  /**
   * Set the fields for a reply
   */
  private handleReplyFields() {
    if (this.currentMessage && this.currentMessage.headers) {

      if (this.inputContentType == "html") {
        this.handleReplyInHtml()
      } else if (this.inputContentType == "plaintext") {
        this.handleReplyInPlaintext()
      }

      if (this.currentMessage.headers["reply-to"] && this.currentMessage.headers["reply-to"].length) {
        this.model.to = this.mailchainService.parseAddressFromMailchain(this.currentProtocol, this.currentMessage.headers["reply-to"])
      } else {
        this.model.to = this.mailchainService.parseAddressFromMailchain(this.currentProtocol, this.currentMessage.headers["from"])
      }

      this.messageToField = this.currentRecipientValue = this.model.to

      this.model.replyTo = this.model.from = this.mailchainService.parseAddressFromMailchain(this.currentProtocol, this.currentMessage.headers.to)
      this.model.subject = this.addRePrefixToSubject(this.currentMessage["subject"])
    }
  }

  /**
   * Checks for 'Re: ' on the subject and adds it if it is not there already.
   * @param subject the message subject
   */
  private addRePrefixToSubject(subject: string) {
    if (subject.startsWith("Re: ")) {
      return subject
    } else {
      return "Re: " + subject
    }
  };

  /**
  * onSubmit sends email to the local service. It includes the reset form to handle errors and resets.
  */
  public onSubmit() {
    this.sendMessagesDisabled = true
    var self = this

    this.publicKeyService.getPublicKeyFromAddress(
      this.model.to,
      this.currentNetwork
    ).subscribe(res => {

      this.model.publicKey = res["body"]["public-key"]
      this.model.publicKeyEncoding = res["body"]["public-key-encoding"]
      this.model.publicKeyKind = res["body"]["public-key-kind"]
      this.model.supportedEncryptionTypes = res["body"]["supported-encryption-types"]

      var outboundMail = this.generateMessage(this.model, this.inputContentType, this.envelopeType, this.currentProtocol)

      this.sendMessage(outboundMail).subscribe(res => {
        self.initMail();
        self.returnToInboxMessages();
      },
        err => {
          this.handleErrorOnPage(
            `Error Code: ${err["error"]["code"]}`,
            `<p>${err["error"]["message"]}</p><p>Please visit <a href="https://docs.mailchain.xyz/troubleshooting/common-inbox-errors" target="_blank">Docs: common inbox errors</a> to see how to fix this.</p>`,
          )
          this.sendMessagesDisabled = false;
          this.resetErrorOnPage();
        });
    })
  }

  /**
   * Builds the OutboundMail object for sending
   * @param mailObj The form Mail object
   */
  private generateMessage(mailObj: Mail, inputContentType: string, envelope: string, protocol: string): OutboundMail {
    return this.mailchainService.generateMail(mailObj, inputContentType, envelope, protocol)
  }

  /**
   * Sends the OutboundMail object on the currently selected network
   * @param outboundMail The OutboundMail object
   */
  private sendMessage(outboundMail: OutboundMail) {
    let protocol = this.currentProtocol
    let network = this.currentNetwork

    return this.sendService.sendMail(outboundMail, protocol, network)
  }

  /**
 * handleErrorOnPage
 */
  public handleErrorOnPage(errorTitle, errorMessage) {

    if (this.errorTitle.length == 0 && this.errorMessage.length == 0) {
      this.errorTitle = errorTitle
      this.errorMessage = errorMessage

      const initialState = {
        errorTitle: errorTitle,
        errorMessage: errorMessage,
      };

      this.modalConnectivityError = this.modalService.show(ModalConnectivityErrorComponent, { initialState });
      this.modalConnectivityError.content.closeBtnName = 'Close'
    }
  }

  /**
   * resetErrorOnPage
   */
  private resetErrorOnPage() {
    this.errorTitle = ""
    this.errorMessage = ""
  }

  public convertToPlainText() {
    let res = confirm("Are you sure? This will remove formatting and cannot be changed back to HTML.")

    if (res == true) {
      let text = document.getElementsByClassName('ck-content')[0]["innerText"]

      this.model.body = text
      this.inputContentType = "plaintext"
      this.setContentTypeSwitchLabel()
    } else {
      document.getElementById('contentTypeSwitch')["checked"] = false
    }

  };

  /**
   * Sets the contentTypeSwitch label
   */
  private setContentTypeSwitchLabel() {
    if (this.inputContentType == "plaintext") {
      return this.contentTypeSwitchLabel = "Plain Text"
    } else {
      return this.contentTypeSwitchLabel = "Convert to Plain Text"
    }
  }
}

