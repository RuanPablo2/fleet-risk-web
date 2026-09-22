import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI = new GoogleGenerativeAI(environment.geminiApiKey);

  constructor() {}

  async generateSalesPitch(veiculo: string, valor: number, coberturas: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = `
      Você é um especialista em vendas de seguro de frota da corretora FleetRisk.
      Crie uma mensagem curta, direta e persuasiva para o WhatsApp (máximo de 3 frases).
      O objetivo é convencer o cliente a fechar a cotação abaixo:
      - Veículo/Frota: ${veiculo}
      - Prêmio Total: R$ ${valor}
      - Coberturas inclusas: ${coberturas}
      
      Não use saudações genéricas longas. Seja fechador de negócios.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Erro ao gerar IA:', error);
      return 'Erro ao conectar com a IA. Tente novamente.';
    }
  }
}