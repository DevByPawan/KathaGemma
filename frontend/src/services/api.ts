import axios from 'axios';

/**
 * Gets or creates a persistent mock childId for the browser session in localStorage.
 */
export const getChildId = (): string => {
  let childId = localStorage.getItem('katha_child_id');
  if (!childId) {
    childId = '11111111-2222-3333-4444-555555555555';
    localStorage.setItem('katha_child_id', childId);
  }
  return childId;
};

export const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
