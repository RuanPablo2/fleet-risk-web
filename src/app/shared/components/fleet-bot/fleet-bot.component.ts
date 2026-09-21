import { Component, OnInit, Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-fleet-bot',
  template: '',
  standalone: true
})
export class FleetBotComponent implements OnInit {

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.injectChatbaseScript();
  }

  private injectChatbaseScript(): void {
    const configScript = this.renderer.createElement('script');
    configScript.text = `
      window.chatbaseConfig = {
        chatbotId: "k2EtnrMmsJ9su8qpkRUJb",
      };
    `;
    this.renderer.appendChild(this.document.body, configScript);

    const mainScript = this.renderer.createElement('script');
    mainScript.src = 'https://www.chatbase.co/embed.min.js';
    mainScript.id = 'k2EtnrMmsJ9su8qpkRUJb';
    mainScript.setAttribute('domain', 'www.chatbase.co');
    mainScript.defer = true;

    this.renderer.appendChild(this.document.body, mainScript);
  }
}