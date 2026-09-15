"use client";

import { useActionState } from "react";

import { Icon } from "@/components/icons";
import { loginAction, type FormState } from "@/app/admin/actions";

const initialState: FormState = null;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="md-field-label" htmlFor="password">
          管理密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="请输入后台管理密码"
          className="md-field"
        />
      </div>

      {state?.error ? (
        <p className="flex items-start gap-2 rounded-2xl bg-danger-container px-4 py-3 text-sm text-on-danger-container">
          <Icon name="warning" size={17} />
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="md-filled-button" disabled={pending}>
        <Icon name="lock" size={17} />
        {pending ? "正在验证…" : "进入管理后台"}
      </button>
    </form>
  );
}
