import { render, screen } from '@testing-library/react';
import Footer from '../frontend/src/Footer';

describe('Footer', () => {
  it('renders the footer with copyright', () => {
    render(<Footer />);
    expect(screen.getByText('© 2024 STX Savings Vault. All rights reserved.')).toBeInTheDocument();
  });
});
