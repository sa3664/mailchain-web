import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { InboxComposeComponent } from './inbox-compose.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HttpHelpersService } from 'src/app/services/helpers/http-helpers/http-helpers.service';
import { Mail } from 'src/app/models/mail';
import { AddressesService } from 'src/app/services/mailchain/addresses/addresses.service';
import { MailchainTestService } from 'src/app/test/test-helpers/mailchain-test.service';
import { of } from 'rxjs';
import { PublicKeyService } from 'src/app/services/mailchain/public-key/public-key.service';
import { RouterTestingModule } from '@angular/router/testing';
import { SendService } from 'src/app/services/mailchain/messages/send.service';
import { OutboundMail } from 'src/app/models/outbound-mail';
import { MailchainService } from 'src/app/services/mailchain/mailchain.service';
import { NameserviceService } from 'src/app/services/mailchain/nameservice/nameservice.service';

import { ModalModule, BsModalRef } from 'ngx-bootstrap/modal';
import { ModalConnectivityErrorComponent } from '../../modals/modal-connectivity-error/modal-connectivity-error.component';
import { NgModule } from '@angular/core';
import { CKEditorModule, CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import { EnvelopeService } from 'src/app/services/mailchain/envelope/envelope.service';
import { AddressesServiceStub } from 'src/app/services/mailchain/addresses/addresses.service.stub';
import { EnvelopeServiceStub } from 'src/app/services/mailchain/envelope/envelope.service.stub';
import { PublicKeyServiceStub } from 'src/app/services/mailchain/public-key/public-key.service.stub';
import { SendServiceStub } from 'src/app/services/mailchain/messages/send.service.stub';
import { NameserviceServiceStub } from 'src/app/services/mailchain/nameservice/nameservice.service.stub';
import { BalanceService } from 'src/app/services/mailchain/addresses/balance.service';
import { BalanceServiceStub } from 'src/app/services/mailchain/addresses/balance.service.stub';


// Workaround:
// Error from entryComponents not present in TestBed. Fix ref: https://stackoverflow.com/a/42399718
@NgModule({
  declarations: [ModalConnectivityErrorComponent],
  entryComponents: [ModalConnectivityErrorComponent]
})
export class FakeModalConnectivityErrorModule { }
// End workaround

describe('InboxComposeComponent', () => {
  let component: InboxComposeComponent;
  let fixture: ComponentFixture<InboxComposeComponent>;
  let mailchainTestService: MailchainTestService
  let publicKeyService: PublicKeyService
  let sendService: SendService
  let mailchainService: MailchainService
  let nameserviceService: NameserviceService

  const currentAccount = '0x92d8f10248c6a3953cc3692a894655ad05d61efb';
  const currentAccount2 = '0x0123456789012345678901234567890123456789';
  const balance = 0;
  const fees = '';
  const ensName = 'mailchain.eth';
  const addresses = [currentAccount, currentAccount2];

  let envelopes: Array<any>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        InboxComposeComponent,
      ],
      providers: [
        HttpHelpersService,
        MailchainService,
        { provide: AddressesService, useClass: AddressesServiceStub },
        { provide: EnvelopeService, useClass: EnvelopeServiceStub },
        { provide: PublicKeyService, useClass: PublicKeyServiceStub },
        { provide: SendService, useClass: SendServiceStub },
        { provide: NameserviceService, useClass: NameserviceServiceStub },
        { provide: BalanceService, useClass: BalanceServiceStub },

      ],
      imports: [
        CKEditorModule,
        FakeModalConnectivityErrorModule,
        FormsModule,
        HttpClientModule,
        ModalModule.forRoot(),
        RouterTestingModule,
      ]
    })
      .compileComponents();
    mailchainTestService = TestBed.inject(MailchainTestService);
    publicKeyService = TestBed.inject(PublicKeyService);
    sendService = TestBed.inject(SendService);
    mailchainService = TestBed.inject(MailchainService);
    nameserviceService = TestBed.inject(NameserviceService);

  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InboxComposeComponent);
    component = fixture.componentInstance;
    component.currentProtocol = 'ethereum'
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    describe('initMail', () => {

      it('should start with an empty Mail object', () => {
        expect(component.model).toEqual(new Mail)
      })

      describe('when composing a new message', () => {
        it('should initialize an empty model "to" field', async () => {
          await component.ngOnInit();
          expect(component.model.to).toBe('')
        })

        it('should initialize the model "from" field with currentAccount', async () => {
          component.currentAccount = currentAccount
          await component.ngOnInit();
          expect(component.model.from).toBe(currentAccount)

          component.currentAccount = currentAccount2
          await component.ngOnInit();
          fixture.detectChanges()
          expect(component.model.from).toBe(currentAccount2)
        })

        it('should initialize the model "reply-to" field with currentAccount', async () => {
          component.currentAccount = currentAccount
          await component.ngOnInit();
          expect(component.model.replyTo).toBe(currentAccount)

          component.currentAccount = currentAccount2
          await component.ngOnInit();
          fixture.detectChanges()
          expect(component.model.replyTo).toBe(currentAccount2)
        })

        it('should initialize an empty model "subject" field', async () => {
          await component.ngOnInit();
          expect(component.model.subject).toBe('')
        })

        it('should initialize an empty model "body" field', async () => {
          await component.ngOnInit();
          expect(component.model.body).toBe('')
        })


        describe('handling the balance', () => {
          it('should initialize a balance in the "balance" field using an available balance', async () => {
            await component.ngOnInit();
            fixture.detectChanges()
            expect(component.balance).toBe(balance)
          })
        });

        describe('handling the fees', () => {
          it('should initialize a Fees in the "fees" field', async () => {
            await component.ngOnInit();
            fixture.detectChanges()
            expect(component.fees).toBe(fees)
          })
        });


        describe('handling the envelope', () => {
          it('should initialize an envelope in the "envelope" field using an available envelop', async () => {
            envelopes = mailchainTestService.envelopeTypeMli()
            await component.ngOnInit();
            fixture.detectChanges()
            expect(component.envelopeType).toBe('0x01')
          })

          it('should populate the envelope_type dropdown with the first value if there are multiple envelopes available', async () => {
            envelopes = mailchainTestService.envelopeTypesMultiple()
            await component.ngOnInit();
            fixture.detectChanges()
            expect(component.envelopeType).toBe('0x01')
          })

        })

      });


      describe('when composing a reply', () => {
        beforeEach(() => {
          component.currentMessage = mailchainTestService.inboundMessage();
        })
        it('should initialize the model "from" field with the recipient address', async () => {
          await component.ngOnInit();
          expect(component.model.from).toBe('0x0123456789abcdef0123456789abcdef01234567')
        })
        xit('should disable the model "from" field on page so the address cannot be changed', async () => {
          // TODO
          await component.ngOnInit();
          // expect(component.mailForm).toBe('0x0123456789abcdef0123456789abcdef01234567')
        })

        it('should initialize the model "replyTo" field with the sender address', async () => {
          await component.ngOnInit();
          expect(component.model.replyTo).toBe('0x0123456789abcdef0123456789abcdef01234567')
        })

        it('should initialize the model "to" field with the reply-to recipient address', async () => {
          await component.ngOnInit();
          expect(component.model.to).toBe('0xABCDEABCDE012345678901234567890123456789')
        })

        xit('should disable the model "to" field on page so the address cannot be changed', async () => {
          // TODO
          await component.ngOnInit();
          // expect(component.mailForm).toBe('0xABCDEABCDE012345678901234567890123456789')
        })

        it('should initialize the model "subject" field with the original message field + a prefix of "Re: "', async () => {
          await component.ngOnInit();
          expect(component.model.subject).toBe('Re: Mailchain Test!')
        })


        it('should not re-initialize the model "subject" field with an extra prefix of "Re: "', async () => {
          component.currentMessage.subject = "Re: Mailchain Test!"
          await component.ngOnInit();
          expect(component.model.subject).toBe('Re: Mailchain Test!')
        })






      });
      describe('when composing a plaintext reply', () => {
        beforeEach(() => {
          component.currentMessage = mailchainTestService.inboundMessage();
        })


        it('should initialize the model "body" field with the original message field', async () => {
          let response = "\r\n\r\n>From: <0x0123456789012345678901234567890123456789@testnet.ethereum>\r\n>Reply To: <0xABCDEABCDE012345678901234567890123456789@testnet.ethereum>\r\n>Date: 2019-06-07T14:53:36Z\r\n>To: <0x0123456789abcdef0123456789abcdef01234567@testnet.ethereum>\r\n>Subject: Mailchain Test!\r\n>\r\n>A body"

          await component.ngOnInit();
          expect(JSON.stringify(component.model.body)).toBe(JSON.stringify(response))
        })
      });

      describe('when composing an html reply', () => {
        beforeEach(() => {
          component.currentMessage = mailchainTestService.inboundMessage();
          component.currentMessage.headers["content-type"] = "text/html; charset=\"UTF-8\""
        })


        it('should initialize the model "body" field with the original message field and wrap the body in a `blockquote`', async () => {
          let response = "<p></p><p><strong>From:</strong> <0x0123456789012345678901234567890123456789@testnet.ethereum><br><strong>Reply To:</strong> <0xABCDEABCDE012345678901234567890123456789@testnet.ethereum><br><strong>Date:</strong> 2019-06-07T14:53:36Z<br><strong>To:</strong> <0x0123456789abcdef0123456789abcdef01234567@testnet.ethereum><br><strong>Subject:</strong> Mailchain Test!</p><blockquote>A body<br></blockquote>"

          await component.ngOnInit();
          expect(JSON.stringify(component.model.body)).toBe(JSON.stringify(response))
        })

      });

      describe('setFromAddressList', () => {
        it('should set the fromAddresses', async () => {
          expect(component.fromAddresses).toEqual([])
          await component.ngOnInit();
          expect(component.fromAddresses).toEqual(addresses)

        })
      });
    });

    describe('initEditor', () => {
      it('should initialize the editor', async () => {
        await component.ngOnInit();
        expect(component.editorComponent).toBeTruthy();
      })
    });
  });

  describe('recipientResolve', () => {
    it('should clear the recipientLoadingIcon if the event target value is empty', () => {
      let event = { target: { value: "" } }
      spyOn(component, 'setRecipientLoadingIcon').and.callThrough()

      component.recipientResolve(event)
      expect(component.setRecipientLoadingIcon).toHaveBeenCalledWith('clear')
      expect(component.recipientLoadingIcon).toEqual("")
    })
    it('should clear the setRecipientLoadingText if the event target value is empty', () => {
      let event = { target: { value: "" } }
      spyOn(component, 'setRecipientLoadingText').and.callThrough()

      component.recipientResolve(event)
      expect(component.setRecipientLoadingText).toHaveBeenCalled()
      expect(component.recipientLoadingText).toEqual("")
    })
    it('should reset the model.to field if the event target value is empty', () => {
      let event = { target: { value: "" } }
      spyOn(component, 'resetModelToField').and.callThrough()

      component.recipientResolve(event)
      expect(component.resetModelToField).toHaveBeenCalled()
      expect(component.model.to).toEqual("")
    })

    it('should set the recipientLoadingIcon to loading if the event target value is different to the currentRecipientValue', () => {
      let event = { target: { value: "alice.eth" } }
      spyOn(component, 'setRecipientLoadingIcon').and.callThrough()
      component.currentRecipientValue = "bob.eth"

      component.recipientResolve(event)
      expect(component.setRecipientLoadingIcon).toHaveBeenCalledWith('loading')
      expect(component.recipientLoadingIcon).not.toEqual("")
    })
    it('should clear the setRecipientLoadingText if the event target value is empty', () => {
      let event = { target: { value: "alice.eth" } }
      spyOn(component, 'setRecipientLoadingText').and.callThrough()
      component.currentRecipientValue = "bob.eth"

      component.recipientResolve(event)
      expect(component.setRecipientLoadingText).toHaveBeenCalled()
      expect(component.recipientLoadingText).toEqual("")
    })
    it('should reset the model.to field if the event target value is empty', () => {
      let event = { target: { value: "alice.eth" } }
      spyOn(component, 'resetModelToField').and.callThrough()
      component.currentRecipientValue = "bob.eth"

      component.recipientResolve(event)
      expect(component.resetModelToField).toHaveBeenCalled()
      expect(component.model.to).toEqual("")
    })
    it('should set the currentRecipientValue to event target value when given a name-like value', () => {
      let event = { target: { value: "alice.eth" } }

      component.recipientResolve(event)
      expect(component.currentRecipientValue).toEqual("alice.eth")
    })
    it('should trim whitespace from currentRecipientValue', () => {
      let event = { target: { value: " alice.eth " } }

      component.recipientResolve(event)
      expect(component.currentRecipientValue).toEqual("alice.eth")
    })
    it('should trim whitespace from the call to recipientAddressChanged', () => {
      let event = { target: { value: " alice.eth " } }
      spyOn(component.recipientAddressChanged, 'next').and.callThrough()

      component.recipientResolve(event)
      expect(component.recipientAddressChanged.next).toHaveBeenCalledWith("alice.eth")
    })
    xit('should call the resolveAddress thru the private recipientAddressChanged subscription next function with the event.target.value', () => {
      let event = { target: { value: "alice.eth" } }
      spyOn(component, 'resolveAddress').and.callThrough()
      // todo: track recipientAddressChanged call
    })
  })

  describe('setRecipientLoadingIcon', () => {
    it('should set the recipientLoadingIcon for variable: "loading"', () => {
      component.recipientLoadingIcon = ""
      component.setRecipientLoadingIcon('loading')
      expect(component.recipientLoadingIcon).toBe("fa fa-spinner fa-pulse")
    })
    it('should set the recipientLoadingIcon for variable: "valid"', () => {
      component.recipientLoadingIcon = ""
      component.setRecipientLoadingIcon('valid')
      expect(component.recipientLoadingIcon).toBe("fa fa-check-circle text-success")
    })
    it('should set the recipientLoadingIcon for variable: "invalid"', () => {
      component.recipientLoadingIcon = ""
      component.setRecipientLoadingIcon('invalid')
      expect(component.recipientLoadingIcon).toBe("fa fa-times-circle text-danger")
    })
    it('should set the recipientLoadingIcon for variable: "clear"', () => {
      component.recipientLoadingIcon = ""
      component.setRecipientLoadingIcon('clear')
      expect(component.recipientLoadingIcon).toBe("")
    })
  })

  describe('setRecipientLoadingText', () => {
    it('should set the text to the input value', () => {
      component.setRecipientLoadingText("My message")
      expect(component.recipientLoadingText).toEqual("My message")
    })
    it('should set the text to empty when no value is provided', () => {
      component.setRecipientLoadingText()
      expect(component.recipientLoadingText).toEqual("")
    })
  })

  describe('evaluateReply', () => {
    it('should set isReply to false when composing a new', () => {
      component.ngOnInit();
      component.evaluateReply()
      expect(component.isReply).toBeFalse()
    })
    it('should set isReply to true when composing an existing message', () => {
      component.currentMessage = mailchainTestService.inboundMessage();
      component.ngOnInit();
      component.evaluateReply()
      expect(component.isReply).toBeTrue()
    })

  })

  describe('setupRecipientAddressLookupSubscription', () => {
    xit('should ', () => {
      // todo: needs help
    })
  })

  describe('resetModelToField', () => {
    it('should reset the model.to field', () => {
      component.model.to = "0x0000000"
      component.resetModelToField()
      expect(component.model.to).toEqual("")
    })
  })

  describe('resetModelReplyToField', () => {
    it('should reset the model.replyTo field', () => {
      component.model.replyTo = "0x0000000"
      component.resetModelReplyToField()
      expect(component.model.replyTo).toEqual("")
    })
  })

  describe('resolveAddress', () => {
    describe('in ethereum', () => {
      it('should call nameserviceService.resolveName if given a name-like value', () => {
        spyOn(nameserviceService, 'resolveName').and.callThrough()
        component.currentProtocol = 'ethereum'
        component.resolveAddress(ensName)
        expect(nameserviceService.resolveName).toHaveBeenCalled()

      })
      it('should call nameserviceService.resolveName with params for protocol, network & name-like value ', () => {
        spyOn(nameserviceService, 'resolveName').and.callThrough()
        component.currentProtocol = 'ethereum'
        component.resolveAddress(ensName)
        expect(nameserviceService.resolveName).toHaveBeenCalledWith(
          component.currentProtocol,
          component.currentNetwork,
          ensName
        )
      })
      it('should return an observable with body containing address hash if given a name-like value', async () => {
        component.currentProtocol = 'ethereum'
        let obs = await component.resolveAddress(ensName)
        let expectedBody = { address: "0x0123456789012345678901234567890123456789" }
        obs.subscribe(res => {
          expect(res['body']).toEqual(expectedBody)
        })
      })
      it('should return an observable with body containing address hash if given an address-like value', async () => {
        component.currentProtocol = 'ethereum'
        let obs = await component.resolveAddress(currentAccount)
        let expectedBody = { address: currentAccount }
        obs.subscribe(res => {
          expect(res['body']).toEqual(expectedBody)
        })
      })
      it('should return an observable with body containing empty address hash if given a value that is not name-like or address-like', async () => {
        component.currentProtocol = 'ethereum'
        let obs = await component.resolveAddress('string')
        let expectedBody = { address: '' }
        obs.subscribe(res => {
          expect(res['body']).toEqual(expectedBody)
        })
      })
    });

    describe('in substrate', () => {
      it('should return an observable with body containing address hash if given an address-like value', async () => {
        component.currentProtocol = 'substrate'
        let currentAccount = "15GJj1Lg6kL5bsN49fV1gcd4ezvU6wafsfZn3oZ7bf7EeM5U"
        let obs = await component.resolveAddress(currentAccount)
        let expectedBody = { address: currentAccount }
        obs.subscribe(res => {
          expect(res['body']).toEqual(expectedBody)
        })
      })
    })
    describe('in algorand', () => {
      it('should return an observable with body containing address hash if given an address-like value', async () => {
        component.currentProtocol = 'algorand'
        let currentAccount = "UWH6MCLMZSD2UYWTJVKFKX6JMTX2TGXAOYPUBNHFFQFBBVJULXJXZJNPBU"
        let obs = await component.resolveAddress(currentAccount)
        let expectedBody = { address: currentAccount }
        obs.subscribe(res => {
          expect(res['body']).toEqual(expectedBody)
        })
      })
    })
  })

  describe('returnToInboxMessages', () => {
    it('should call goToInboxMessages.emit() to change the view to  "messages"', () => {
      spyOn(component.goToInboxMessages, 'emit')

      component.returnToInboxMessages()
      expect(component.goToInboxMessages.emit).toHaveBeenCalledWith('')
    })
  });
  describe('returnToMessage', () => {
    it('should call goToInboxMessages.emit() to change the view to  "messages" if there is no currentMessage', () => {
      spyOn(component.goToInboxMessages, 'emit')

      component.returnToMessage()
      expect(component.goToInboxMessages.emit).toHaveBeenCalledWith('')
    })
    it('should call openMessage.emit(`currentMessage`) to change the view to  "messages" if there is a currentMessage', () => {
      spyOn(component.openMessage, 'emit')
      component.currentMessage = mailchainTestService.inboundMessage();

      component.returnToMessage()
      expect(component.openMessage.emit).toHaveBeenCalledWith(component.currentMessage)
    })
  });
  describe('supressEnterPropagation', () => {
    it('should stop event propagation when Enter is pressed', () => {
      let $event = new KeyboardEvent('keydown', { 'code': 'Enter' })
      spyOn($event, 'stopPropagation')
      component.supressEnterPropagation($event)
      expect($event.stopPropagation).toHaveBeenCalled()
    })
  });

  describe('onSubmit', () => {
    let expectedMail = new Mail
    expectedMail.to = ''
    expectedMail.from = ''
    expectedMail.subject = ''
    expectedMail.body = ''
    expectedMail.publicKey = "0x1234567890"
    expectedMail.publicKeyEncoding = "hex/0x-prefix"
    expectedMail.publicKeyKind = "secp256k1"
    expectedMail.supportedEncryptionTypes = ["aes256cbc", "noop"]

    let outboundMail = new OutboundMail
    outboundMail.message = {
      body: 'This is a test message',
      headers: {
        "from": '0x0123456789012345678901234567890123456789',
        "reply-to": '0x0123456789012345678901234567890123456789',
        "to": '0x92d8f10248c6a3953cc3692a894655ad05d61efb'
      },
      "public-key": "0x1234567890",
      "public-key-encoding": "hex/0x-prefix",
      "public-key-kind": "secp256k1",
      subject: 'Test Message'
    }
    outboundMail.envelope = "0x05"
    outboundMail["content-type"] = 'text/html; charset=\"UTF-8\"'

    beforeEach(() => {
      component.model.to = currentAccount
      component.model.from = currentAccount2
      component.model.subject = "Test Message"
      component.model.body = "This is a test message"
      component.currentProtocol = 'ethereum'
      component.currentNetwork = 'testnet'
      component.envelopeType = "0x05"


      spyOn(publicKeyService, "getPublicKeyFromAddress").and.callThrough()
      // callFake(() => {
      //   return of({
      //     "body": {
      //       "public-key": '1234567890abcd'
      //     }
      //   })
      // });
      spyOn(sendService, "sendMail").and.callThrough()
      // callFake(() => {
      //   return of(['ok'])
      // });

      spyOn(mailchainService, "generateMail").and.callThrough()
      // .callFake(() => {
      //   return outboundMail
      // })
    })

    it('should get the public key for an address', async () => {
      component.onSubmit();

      expect(publicKeyService.getPublicKeyFromAddress).toHaveBeenCalledWith(currentAccount, 'testnet')
    })

    it('should send a message using the sendService', () => {

      component.onSubmit();
      expect(sendService.sendMail).toHaveBeenCalledWith(outboundMail, 'ethereum', 'testnet')
    })

    it('should generate a message', () => {

      component.onSubmit();
      expect(mailchainService.generateMail).toHaveBeenCalledWith(expectedMail, 'html', '0x05', 'ethereum')

    })

    it('should reinitialize the message after sending', () => {

      component.onSubmit();
      expect(component.model).toEqual(expectedMail)
    })
    it('should call returnToInboxMessages after sending', () => {
      spyOn(component, "returnToInboxMessages")
      component.onSubmit();
      expect(component.returnToInboxMessages).toHaveBeenCalled()
    })
    xit('should validate form fields', () => {
      // expect()
    })
    xit('should handle public key lookup failure', () => {
      // expect()
    })
  });

  describe('handleErrorOnPage', () => {
    it('should show error on page', () => {
      expect(component.errorTitle).toEqual("")
      expect(component.errorMessage).toEqual("")

      let title = "Error Title"
      let msg = "Error Message"

      component.handleErrorOnPage(title, msg)

      expect(component.errorTitle).toEqual(title)
      expect(component.errorMessage).toEqual(msg)

      expect(component.modalConnectivityError.content["errorTitle"]).toEqual(title)
      expect(component.modalConnectivityError.content["errorMessage"]).toEqual(msg)

    });

    it('should only show error on page if no other error is present', () => {
      let origTitle = "Existing error"
      let origMsg = "Error is already in view"
      let title = "Error Title"
      let msg = "Error Message"

      component.errorTitle = origTitle
      component.errorMessage = origMsg

      component.handleErrorOnPage(title, msg)

      expect(component.errorTitle).toEqual(origTitle)
      expect(component.errorMessage).toEqual(origMsg)

    });
  });

  describe('convertToPlainText', () => {
    it('should convert html to plain text when confirm box is OK', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      let res = "Replying to a message<br><br>From: <0xd5ab4ce3605cd590db609b6b5c8901fdb2ef7fe6@ropsten.ethereum><br>Date: 2019-12-05T21:17:04Z<br>To: <0x92d8f10248c6a3953cc3692a894655ad05d61efb@ropsten.ethereum><br>Subject: Fw: another message<br><br>Sending a message"

      let newDiv = document.createElement("div");
      newDiv.innerHTML = `<div class="ck ck-content ck-editor__editable ck-rounded-corners ck-editor__editable_inline ck-blurred" lang="en" dir="ltr" role="textbox" aria-label="Rich Text Editor, main" contenteditable="true"><p>${res}</p></div>`
      document.body.append(newDiv)

      component.convertToPlainText()

      expect(window.confirm).toHaveBeenCalled()
      expect(component.inputContentType).toEqual('plaintext')
      expect(component.model.body).toBe('Replying to a message\n\nFrom: <0xd5ab4ce3605cd590db609b6b5c8901fdb2ef7fe6@ropsten.ethereum>\nDate: 2019-12-05T21:17:04Z\nTo: <0x92d8f10248c6a3953cc3692a894655ad05d61efb@ropsten.ethereum>\nSubject: Fw: another message\n\nSending a message')

    })
    it('should not convert html to plain text when confirm box is cancel', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.convertToPlainText()

      expect(window.confirm).toHaveBeenCalled()
      expect(component.inputContentType).toEqual('html')
    })
  });

});


