import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('should render button with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should apply primary variant by default', () => {
    const { container } = render(<Button>Test</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-primary');
  });

  it('should apply secondary variant when specified', () => {
    const { container } = render(<Button variant="secondary">Test</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-secondary');
  });

  it('should apply danger variant when specified', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-destructive');
  });

  it('should apply size classes correctly', () => {
    const { container } = render(<Button size="sm">Small</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('h-9');
  });

  it('should be disabled when disabled prop is passed', () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const button = container.querySelector('button');
    expect(button).toBeDisabled();
  });

  it('should call onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    const button = screen.getByText('Click');
    button.click();
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should merge custom className with default classes', () => {
    const { container } = render(<Button className="custom-class">Test</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('custom-class');
  });
});

