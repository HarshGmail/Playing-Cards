'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignupMutation } from '@/lib/queries/auth';
import { signupSchema } from '@/lib/schemas/auth';
import {
  hasNoProblems,
  phoneKeystroke,
  signupPayload,
  signupProblems,
  suggestUsername,
  usernameAlternatives,
  usernameFormatError,
  usernameKeystroke,
  type DobParts,
  type SignupField,
  type SignupPayload,
} from '@/lib/domain/signupForm';
import UsernameField from './signup/UsernameField';
import DobField from './signup/DobField';
import PasswordFields from './signup/PasswordFields';
import { useUsernameAvailability } from './signup/useUsernameAvailability';
import { ERROR_CLASS, INPUT_CLASS, LABEL_CLASS } from './signup/fieldStyles';

interface SignupFormProps {
  onSuccess?: () => void;
}

const EMPTY_DOB: DobParts = { day: '', month: '', year: '' };
const FOCUSABLE_SELECTOR = 'input, select';
const SUBMIT_SELECTOR = 'button[type="submit"]';
const NAME_MAX_LENGTH = 100;

function serverAccepts(field: keyof SignupPayload, value: string): boolean {
  return signupSchema.shape[field].safeParse(value).success;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const router = useRouter();
  const signupMutation = useSignupMutation();
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [usernameRejection, setUsernameRejection] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dobParts, setDobParts] = useState<DobParts>(EMPTY_DOB);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState<Set<SignupField>>(() => new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [serverError, setServerError] = useState('');

  const isLoading = signupMutation.isPending;
  const availability = useUsernameAvailability(username, usernameFormatError(username) === null);
  const alternatives = useMemo(
    () => (availability === 'taken' ? usernameAlternatives(username) : []),
    [availability, username]
  );

  const draft = { name, username, email, phone, dobParts, password, confirmPassword };
  const problems = signupProblems(draft, availability, serverAccepts);

  const markTouched = (field: SignupField) =>
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  const visibleProblem = (field: SignupField) =>
    showAllErrors || touched.has(field) ? problems[field] : null;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!usernameEdited) {
      setUsername(suggestUsername(value));
      setUsernameRejection(null);
    }
  };

  const handleUsernameChange = (raw: string) => {
    const { value, rejection } = usernameKeystroke(raw);
    setUsername(value);
    setUsernameRejection(rejection);
    setUsernameEdited(true);
  };

  const pickAlternative = (candidate: string) => {
    setUsername(candidate);
    setUsernameRejection(null);
    setUsernameEdited(true);
  };

  const submitViaButton = () => {
    formRef.current?.querySelector<HTMLButtonElement>(SUBMIT_SELECTOR)?.click();
  };

  const focusNextField = (current: HTMLElement) => {
    const form = formRef.current;
    if (!form) return;
    const fields = Array.from(form.querySelectorAll<HTMLInputElement>(FOCUSABLE_SELECTOR)).filter(
      (field) => !field.disabled
    );
    const next = fields[fields.indexOf(current as HTMLInputElement) + 1];
    if (next) next.focus();
    else submitViaButton();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;
    event.preventDefault();
    focusNextField(target);
  };

  const focusFirstProblem = () => {
    window.requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    setServerError('');
    if (!hasNoProblems(problems)) {
      setShowAllErrors(true);
      focusFirstProblem();
      return;
    }

    try {
      await signupMutation.mutateAsync(signupPayload(draft));
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    }
  };

  const nameProblem = visibleProblem('name');
  const emailProblem = visibleProblem('email');
  const phoneProblem = visibleProblem('phone');

  return (
    <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="space-y-5">
      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="signup-name" className={LABEL_CLASS}>
          Full name
        </label>
        <input
          id="signup-name"
          type="text"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={NAME_MAX_LENGTH}
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          onBlur={() => markTouched('name')}
          placeholder="John Doe"
          disabled={isLoading}
          aria-invalid={!!nameProblem}
          className={INPUT_CLASS}
        />
        {nameProblem && <p className={ERROR_CLASS}>{nameProblem}</p>}
      </div>

      <UsernameField
        value={username}
        onChange={handleUsernameChange}
        rejection={usernameRejection}
        formatError={usernameFormatError(username)}
        availability={availability}
        alternatives={alternatives}
        onPickAlternative={pickAlternative}
        showErrors={showAllErrors}
        disabled={isLoading}
      />

      <div>
        <label htmlFor="signup-email" className={LABEL_CLASS}>
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          name="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          enterKeyHint="next"
          value={email}
          onChange={(event) => setEmail(event.target.value.replace(/\s/g, ''))}
          onBlur={() => markTouched('email')}
          placeholder="john@example.com"
          disabled={isLoading}
          aria-invalid={!!emailProblem}
          className={INPUT_CLASS}
        />
        {emailProblem && <p className={ERROR_CLASS}>{emailProblem}</p>}
      </div>

      <div>
        <label htmlFor="signup-phone" className={LABEL_CLASS}>
          Phone
        </label>
        <input
          id="signup-phone"
          type="tel"
          name="phone"
          autoComplete="tel"
          inputMode="tel"
          enterKeyHint="next"
          value={phone}
          onChange={(event) => setPhone(phoneKeystroke(event.target.value))}
          onBlur={() => markTouched('phone')}
          placeholder="+91 98765 43210"
          disabled={isLoading}
          aria-invalid={!!phoneProblem}
          className={INPUT_CLASS}
        />
        {phoneProblem && <p className={ERROR_CLASS}>{phoneProblem}</p>}
      </div>

      <DobField parts={dobParts} onChange={setDobParts} showError={showAllErrors} disabled={isLoading} />

      <PasswordFields
        password={password}
        confirmPassword={confirmPassword}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirmPassword}
        showErrors={showAllErrors}
        disabled={isLoading}
      />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-violet-600 py-3 text-base font-semibold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-700 disabled:opacity-60"
      >
        {isLoading ? 'Creating your account...' : 'Create account'}
      </button>
    </form>
  );
}
