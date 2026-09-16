import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

interface BaseFieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

function FieldShell({ label, hint, children }: BaseFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint ? <small className="muted">{hint}</small> : null}
    </div>
  );
}

export function Field({ label, hint, children }: BaseFieldProps) {
  return <FieldShell label={label} hint={hint}>{children}</FieldShell>;
}

export function TextField({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <FieldShell label={label} hint={hint}>
      <input {...props} />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <FieldShell label={label} hint={hint}>
      <textarea {...props} />
    </FieldShell>
  );
}
