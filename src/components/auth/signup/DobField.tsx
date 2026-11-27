'use client';

import { useMemo } from 'react';
import {
  DOB_OLDEST_YEAR,
  MONTH_NAMES,
  daysInMonth,
  type DobParts,
} from '@/lib/domain/signupForm';
import { ERROR_CLASS, INPUT_CLASS, LABEL_CLASS } from './fieldStyles';

interface DobFieldProps {
  parts: DobParts;
  onChange: (next: DobParts) => void;
  showError: boolean;
  disabled: boolean;
}

const SELECT_CLASS = `${INPUT_CLASS} appearance-none pr-8`;

export default function DobField({ parts, onChange, showError, disabled }: DobFieldProps) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: currentYear - DOB_OLDEST_YEAR + 1 }, (_, index) => currentYear - index),
    [currentYear]
  );
  const monthNumber = Number(parts.month) || 1;
  const yearNumber = Number(parts.year) || currentYear;
  const dayCount = daysInMonth(monthNumber, yearNumber);
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const missing = showError && (!parts.day || !parts.month || !parts.year);

  const update = (field: keyof DobParts, value: string) => {
    const next = { ...parts, [field]: value };
    const maxDay = daysInMonth(Number(next.month) || 1, Number(next.year) || currentYear);
    if (Number(next.day) > maxDay) next.day = '';
    onChange(next);
  };

  return (
    <div>
      <p className={LABEL_CLASS} id="dob-label">
        Date of birth
      </p>
      <div role="group" aria-labelledby="dob-label" className="grid grid-cols-3 gap-2">
        <select
          aria-label="Day"
          name="bday-day"
          autoComplete="bday-day"
          value={parts.day}
          onChange={(event) => update('day', event.target.value)}
          disabled={disabled}
          aria-invalid={missing && !parts.day}
          className={SELECT_CLASS}
        >
          <option value="">Day</option>
          {days.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
        <select
          aria-label="Month"
          name="bday-month"
          autoComplete="bday-month"
          value={parts.month}
          onChange={(event) => update('month', event.target.value)}
          disabled={disabled}
          aria-invalid={missing && !parts.month}
          className={SELECT_CLASS}
        >
          <option value="">Month</option>
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          name="bday-year"
          autoComplete="bday-year"
          value={parts.year}
          onChange={(event) => update('year', event.target.value)}
          disabled={disabled}
          aria-invalid={missing && !parts.year}
          className={SELECT_CLASS}
        >
          <option value="">Year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      {missing && <p className={ERROR_CLASS}>Pick your day, month and year</p>}
    </div>
  );
}
