import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('should render input element', () => {
    const { container } = render(<Input />);
    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
  });

  it('should render label when label prop is provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should not render label when label prop is not provided', () => {
    const { container } = render(<Input />);
    const label = container.querySelector('label');
    expect(label).not.toBeInTheDocument();
  });

  it('should pass input props correctly', () => {
    const { container } = render(<Input type="email" placeholder="Enter email" name="email" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toHaveAttribute('name', 'email');
  });

  it('should be disabled when disabled prop is passed', () => {
    const { container } = render(<Input disabled />);
    const input = container.querySelector('input');
    expect(input).toBeDisabled();
  });

  it('should call onChange handler when value changes', () => {
    const handleChange = vi.fn();
    const { container } = render(<Input onChange={handleChange} />);
    const input = container.querySelector('input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'test' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should merge custom className with default classes', () => {
    const { container } = render(<Input className="custom-input" />);
    const input = container.querySelector('input');
    expect(input?.className).toContain('custom-input');
  });
});
