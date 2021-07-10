export interface Event {
    name: string;
    id: string;
}

export type EventHandler = (event: Event) => Promise<any>;

export abstract class State {
    // by default name of state is the class name
    public get name(): string {
        return this.constructor.name;
    }

    // The state can register handlers to specific events:
    // a handler is a function that recieves an event (detected by string) and returns something
    public readonly handlers: { [eventName: string]: EventHandler } = {};
    protected registerHandler(
        eventName: string,
        eventHandler: EventHandler
    ): void {
        this.handlers[eventName] = eventHandler;
    }

    // The state will handle an event if it has a handler, otherwise it will skip
    async handle(event: Event): Promise<any> {
        if (!(event.name in this.handlers)) return;
        return await this.handlers[event.name](event);
    }
}

export class FSM {
    public readonly states: { [stateName: string]: State };
    public readonly transitions: {
        [stateName: string]: { [eventName: string]: string };
    } = {};
    private _currentState: State;

    // fsm constructor recieves all the states and the initial state
    constructor(states: State[], initialState: State) {
        this.states = states.reduce(
            (obj: { [stateName: string]: State }, state: State) => {
                obj[state.name] = state;
                return obj;
            },
            {}
        );
        this._currentState = initialState;
    }

    // transitions are added dynamically
    // more readable (could have been in the constructor as well)
    // throws an error if any of the state names is invalid
    registerTransition(
        stateName: string,
        eventName: string,
        nextStateName: string
    ) {
        if (!(stateName in this.states))
            throw new Error(`${stateName} is not a valid state`);
        if (!(nextStateName in this.states))
            throw new Error(`${nextStateName} is not a valid state`);
        if (!this.transitions[stateName]) this.transitions[stateName] = {};
        this.transitions[stateName][eventName] = nextStateName;
    }

    // Main method of the FSM
    // it will make the transition and call the handler of the current state
    // if there is no transition assigned from current state with this event, then no transition will occur
    async handle(event: Event): Promise<any> {
        const nextStateName =
            event.name in this.transitions[this._currentState.name]
                ? this.transitions[this._currentState.name][event.name]
                : this._currentState.name;
        const result = await this._currentState.handle(event);
        this._currentState = this.states[nextStateName];
        return result;
    }

    public get currentState(): State {
        return this._currentState;
    }
}
