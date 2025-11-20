import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsCards from '../StatsCards';

describe('StatsCards', () => {
  it('renders all stat cards with correct values', () => {
    const props = {
      totalProjects: 5,
      totalTasks: 120,
      totalModels: 10,
      avgProgress: 75,
    };

    render(<StatsCards {...props} />);

    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();

    expect(screen.getByText('Models Uploaded')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    expect(screen.getByText('Avg Progress')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
