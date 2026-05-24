import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private client: Client;
  private connected = false;

  constructor() {
    this.client = new Client({
      brokerURL: 'ws://localhost:8081/ws/quotes',
      reconnectDelay: 5000,
      debug: (msg: string) => console.log('[WebSocket]', msg),
    });

    this.client.onConnect = () => {
      this.connected = true;
      console.log('🔌 Conectado ao WebSocket do Motor Atuarial!');
    };

    this.client.activate();
  }

  watchQuoteStatus(quoteId: number): Observable<string> {
    const subject = new Subject<string>();

    const subscribe = () => {
      this.client.subscribe(`/topic/quotes/${quoteId}`, (message: Message) => {
        subject.next(message.body);
      });
    };

    if (this.connected) {
      subscribe();
    } else {
      this.client.onConnect = () => {
        this.connected = true;
        subscribe();
      };
    }

    return subject.asObservable();
  }
}
