import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    cnpj: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/),
      ],
    ],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onCnpjInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    value = value.replace(/\D/g, '');

    if (value.length > 14) {
      value = value.substring(0, 14);
    }

    if (value.length > 12) {
      value = value.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/,
        '$1.$2.$3/$4-$5',
      );
    } else if (value.length > 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
    }

    input.value = value;
    this.registerForm.get('cnpj')?.setValue(value, { emitEvent: false });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const formValue = this.registerForm.value;

      const payload = {
        brokerName: formValue.name,
        cnpj: formValue.cnpj.replace(/\D/g, ''),
        email: formValue.email,
        password: formValue.password,
      };

      this.authService.register(payload).subscribe({
        next: () => {
          alert('Conta criada com sucesso! Faça o login.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('🚨 Erro ao registrar:', err);
          alert('Erro ao criar conta. Verifique os dados.');
        },
      });
    }
  }
}
