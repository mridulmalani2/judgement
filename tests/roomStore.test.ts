/**
 * Basic Room Store Tests
 * 
 * Run with: npm test (if you have Jest set up)
 * Or manually verify by importing and calling these functions
 */

import { getGameState, setGameState, pushAction, drainActions, deleteGameState } from '../lib/roomStore';
import { GameState, GameAction } from '../lib/types';

/**
 * Test basic state operations
 */
export async function testBasicStateOperations() {
    console.log('Testing basic state operations...');

    const testRoomCode = 'TEST123';

    // Create a test GameState
    const testState: GameState = {
        roomCode: testRoomCode,
        players: [
            {
                id: 'player1',
                name: 'Test Player',
                seatIndex: 0,
                isHost: true,
                connected: true,
                isAway: false,
                currentBet: null,
                tricksWon: 0,
                totalPoints: 0,
                hand: []
            }
        ],
        roundIndex: 0,
        cardsPerPlayer: 0,
        trump: 'spades',
        dealerSeatIndex: 0,
        currentLeaderSeatIndex: 0,
        currentTrick: [],
        phase: 'lobby',
        deckSeed: 'test-seed',
        scoresHistory: [],
        settings: {
            discardStrategy: 'random',
            autoPlayEnabled: true,
            allowSpectators: true
        }
    };

    // Test 1: Set state
    await setGameState(testRoomCode, testState);
    console.log('✓ State set successfully');

    // Test 2: Get state
    const retrievedState = await getGameState(testRoomCode);
    if (!retrievedState) {
        throw new Error('Failed to retrieve state');
    }
    console.log('✓ State retrieved successfully');

    // Test 3: Verify timestamp was added
    if (!retrievedState.lastUpdate) {
        throw new Error('lastUpdate timestamp not added');
    }
    console.log('✓ Timestamp added automatically');

    // Test 4: Delete state
    await deleteGameState(testRoomCode);
    const deletedState = await getGameState(testRoomCode);
    if (deletedState !== null) {
        throw new Error('State was not deleted');
    }
    console.log('✓ State deleted successfully');

    console.log('All basic state tests passed! ✓\n');
}

/**
 * Test action queue operations
 */
export async function testActionQueue() {
    console.log('Testing action queue operations...');

    const testRoomCode = 'TEST456';

    // First, create a room state
    const testState: GameState = {
        roomCode: testRoomCode,
        players: [],
        roundIndex: 0,
        cardsPerPlayer: 0,
        trump: 'spades',
        dealerSeatIndex: 0,
        currentLeaderSeatIndex: 0,
        currentTrick: [],
        phase: 'lobby',
        deckSeed: 'test-seed',
        scoresHistory: [],
        settings: {
            discardStrategy: 'random',
            autoPlayEnabled: true,
            allowSpectators: true
        }
    };
    await setGameState(testRoomCode, testState);

    // Test 1: Push actions
    const action1: GameAction = {
        type: 'JOIN',
        playerId: 'player1',
        payload: { name: 'Player 1' }
    };
    const action2: GameAction = {
        type: 'JOIN',
        playerId: 'player2',
        payload: { name: 'Player 2' }
    };

    await pushAction(testRoomCode, action1, 'player1');
    await pushAction(testRoomCode, action2, 'player2');
    console.log('✓ Actions pushed successfully');

    // Test 2: Drain actions
    const actions = await drainActions(testRoomCode);
    if (actions.length !== 2) {
        throw new Error(`Expected 2 actions, got ${actions.length}`);
    }
    console.log('✓ Actions drained successfully');

    // Test 3: Verify actions are in correct order
    if (actions[0].playerId !== 'player1' || actions[1].playerId !== 'player2') {
        throw new Error('Actions not in correct order');
    }
    console.log('✓ Actions in correct order');

    // Test 4: Verify queue is empty after drain
    const emptyActions = await drainActions(testRoomCode);
    if (emptyActions.length !== 0) {
        throw new Error('Queue not empty after drain');
    }
    console.log('✓ Queue empty after drain');

    // Cleanup
    await deleteGameState(testRoomCode);

    console.log('All action queue tests passed! ✓\n');
}

/**
 * Run all tests
 */
export async function runAllTests() {
    console.log('=== Room Store Test Suite ===\n');

    try {
        await testBasicStateOperations();
        await testActionQueue();
        console.log('=== All tests passed! ===');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}
