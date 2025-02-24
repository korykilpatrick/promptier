import { configureStore } from '@reduxjs/toolkit';
import templateReducer from './templateSlice';

// Configure the Redux store
const store = configureStore({
  reducer: {
    templates: templateReducer,
  },
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store; 