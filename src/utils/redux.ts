import type { PayloadAction } from '@reduxjs/toolkit';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { ethers } from 'ethers';

interface TxHistoryState {
  txHistory: {
    [key: string]: ethers.providers.TransactionResponse | null;
  };
  txOrder: Array<string>;
}

// Define the initial state using that type
const initialState: TxHistoryState = {
  txHistory: {
    txHash: null,
  },
  txOrder: [''],
};

export const txHistorySlice = createSlice({
  name: 'tx',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    addNewHash: (
      state,
      action: PayloadAction<ethers.providers.TransactionResponse>
    ) => {
      // eslint-disable-next-line no-param-reassign
      state.txHistory[action.payload.hash] = action.payload;
      // eslint-disable-next-line no-param-reassign
      state.txOrder.push(action.payload.hash);
    },
  },
});

export const { addNewHash } = txHistorySlice.actions;

export default txHistorySlice.reducer;

export const store = configureStore({
  reducer: txHistorySlice.reducer,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
