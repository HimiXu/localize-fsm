import { promises } from "fs";

export interface Event {
    name: string;
    id: string;
}

export type EventHandler = (event: Event) => Promise<any>;

// I have decided to delegate the state transitions to the machine level and not to the state level
// This is because:
// - transition between states is an abstraction of the machine and not the state itself
// - makes the machine much more readable on creation
// - allows to have some functionality with return value when handling an event

export abstract class State {
    // the name of the state is its class name
    public get name(): string {
        return this.constructor.name;
    }
    // The state can register handlers to specific events:
    // a handler is a function that recieves an event (detected by string) and returns something
    private readonly handlers: { [eventName: string]: EventHandler } = {};
    constructor(handlers: { [eventName: string]: EventHandler }) {
        this.handlers = handlers;
    }

    // The state will handle an event if it has a handler, otherwise it will skip
    public async handle(event: Event): Promise<any> {
        if (!(event.name in this.handlers)) return;
        return await this.handlers[event.name](event);
    }
}

export class Machine {
    private readonly states: { [stateName: string]: State };
    private readonly transitions: {
        [stateName: string]: { [eventName: string]: string };
    } = {};
    private _currentStateName: string;

    // fsm constructor recieves all the states, transitions and the initial state
    constructor(
        states: State[],
        transitions: {
            [stateName: string]: { [eventName: string]: string };
        },
        initialStateName: string
    ) {
        // array to map(name -> state)
        this.states = states.reduce(
            (obj: { [stateName: string]: State }, state: State) => {
                obj[state.name] = state;
                return obj;
            },
            {}
        );
        this.validateStateName(initialStateName);
        this._currentStateName = initialStateName;
        Object.entries(transitions).forEach(([stateName, transitions]) => {
            Object.entries(transitions).forEach(
                ([eventName, nextStateName]) => {
                    // validate that the states names are valid (of state in the states array)
                    if (!(stateName in this.states))
                        throw new Error(`${stateName} is not a valid state`);
                    if (!(nextStateName in this.states))
                        throw new Error(
                            `${nextStateName} is not a valid state`
                        );
                    if (!this.transitions[stateName])
                        this.transitions[stateName] = {};
                    this.transitions[stateName][eventName] = nextStateName;
                }
            );
        });
    }

    // Main method of the FSM
    // it will make the transition and call the handler of the current state
    // if there is no transition assigned from current state with this event, then no transition will occur
    async handle(event: Event): Promise<any> {
        const nextStateName =
            event.name in this.transitions[this._currentStateName]
                ? this.transitions[this._currentStateName][event.name]
                : this._currentStateName;
        const result = await this.states[this._currentStateName].handle(event);
        this._currentStateName = nextStateName;
        return result;
    }

    public get currentStateName(): string {
        return this._currentStateName;
    }

    private validateStateName(stateName: string) {
        if (!Object.keys(this.states).includes(stateName))
            throw new Error(
                `Cannot set state ${stateName} must be in states ${Object.keys(
                    this.states
                )}`
            );
    }

    public set currentStateName(stateName: string) {
        this.validateStateName(stateName);
        this._currentStateName = stateName;
    }
}

// persistence capability
export const saveState = async (fsm: Machine, path: string) => {
    const state: string = fsm.currentStateName;
    await promises.writeFile(path, state);
};
export const reloadState = async (fsm: Machine, path: string) => {
    const state: string = (await promises.readFile(path)).toString();
    fsm.currentStateName = state;
};

// Builder of Machine for better readability
export class MachineBuilder {
    private _states: State[] = [];
    private transitions: {
        [stateName: string]: { [eventName: string]: string };
    } = {};
    private _initialStateName: string = "";
    states(states: State[]): MachineBuilder {
        this._states = states;
        return this;
    }
    transition(
        stateName: string,
        eventName: string,
        nextStateName: string
    ): MachineBuilder {
        if (!this.transitions[stateName]) this.transitions[stateName] = {};
        this.transitions[stateName][eventName] = nextStateName;
        return this;
    }
    initialStateName(initialStateName: string): MachineBuilder {
        this._initialStateName = initialStateName;
        return this;
    }
    build(): Machine {
        return new Machine(
            this._states,
            this.transitions,
            this._initialStateName
        );
    }
}
