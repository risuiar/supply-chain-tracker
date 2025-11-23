import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardContent } from './Card';

describe('Card', () => {
  it('should render card with children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should apply default card styles', () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.querySelector('div');
    expect(card?.className).toContain('bg-white');
    expect(card?.className).toContain('rounded-lg');
  });

  it('should merge custom className with default classes', () => {
    const { container } = render(<Card className="custom-card">Test</Card>);
    const card = container.querySelector('div');
    expect(card?.className).toContain('custom-card');
  });
});

describe('CardHeader', () => {
  it('should render card header with children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('should apply default header styles', () => {
    const { container } = render(<CardHeader>Test</CardHeader>);
    const header = container.querySelector('div');
    expect(header?.className).toContain('px-6');
    expect(header?.className).toContain('py-4');
  });

  it('should merge custom className with default classes', () => {
    const { container } = render(<CardHeader className="custom-header">Test</CardHeader>);
    const header = container.querySelector('div');
    expect(header?.className).toContain('custom-header');
  });
});

describe('CardContent', () => {
  it('should render card content with children', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should apply default content styles', () => {
    const { container } = render(<CardContent>Test</CardContent>);
    const content = container.querySelector('div');
    expect(content?.className).toContain('px-6');
    expect(content?.className).toContain('py-4');
  });

  it('should merge custom className with default classes', () => {
    const { container } = render(<CardContent className="custom-content">Test</CardContent>);
    const content = container.querySelector('div');
    expect(content?.className).toContain('custom-content');
  });
});

