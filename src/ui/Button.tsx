import type { ButtonHTMLAttributes } from 'react'

export function Button({ variant = 'primary', size = 'normal', className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'normal' | 'big' }) {
  const cls = ['btn', variant !== 'primary' && variant, size === 'big' && 'big', className].filter(Boolean).join(' ')
  return <button type={type} className={cls} {...rest} />
}
