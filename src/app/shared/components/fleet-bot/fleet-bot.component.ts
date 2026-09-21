import { Component, OnInit, OnDestroy, Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-fleet-bot',
  template: '',
  standalone: true
})
export class FleetBotComponent implements OnInit, OnDestroy {
  private configScript?: HTMLScriptElement;
  private mainScript?: HTMLScriptElement;

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.injectChatbaseScript();
  }

  ngOnDestroy(): void {
    this.cleanupChatbase();
  }

  private injectChatbaseScript(): void {
    this.configScript = this.renderer.createElement('script');
    this.configScript!.text = `
      window.chatbaseConfig = {
        chatbotId: "k2EtnrMmsJ9su8qpkRUJb",
      };
    `;
    this.renderer.appendChild(this.document.body, this.configScript);

    this.mainScript = this.renderer.createElement('script');
    this.mainScript!.src = 'https://www.chatbase.co/embed.min.js';
    this.mainScript!.id = 'k2EtnrMmsJ9su8qpkRUJb';
    this.mainScript!.setAttribute('domain', 'www.chatbase.co');
    this.mainScript!.defer = true;

    this.renderer.appendChild(this.document.body, this.mainScript);
  }

  private cleanupChatbase(): void {
    if (this.configScript) {
      this.renderer.removeChild(this.document.body, this.configScript);
    }
    if (this.mainScript) {
      this.renderer.removeChild(this.document.body, this.mainScript);
    }

    const chatbaseElements = this.document.querySelectorAll('[id^="chatbase"]');
    chatbaseElements.forEach(element => {
      element.remove();
    });

    if ((window as any).chatbaseConfig) {
      delete (window as any).chatbaseConfig;
    }
    if ((window as any).chatbase) {
      delete (window as any).chatbase;
    }
  }
}