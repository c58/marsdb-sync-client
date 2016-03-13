import React from 'react';
import TodoModel from '../models/Todo.model';
import * as MarsClient from 'marsdb-sync-client';


export default class DDPTestComponent extends React.Component {
  state = {
    messages: ['Started'],
  };

  componentDidMount() {
    TodoModel.find({}, {sub: ['allTodos']}).observe((todos) => {
      this.setState({messages: todos});
    })
  }

  handleClickHello = () => {
    MarsClient.call('sayHello', Math.random());
  };

  handleInsert = () => {
    TodoModel.insert({
      text: 'Todo #' + Math.random(),
      complete: false,
    });
  };

  render() {
    const { messages } = this.state;
    return (
      <article>
        <h1>DDP messages</h1>
        <div>
          <button onClick={this.handleClickHello}>Say "Hallo"</button>
          <button onClick={this.handleInsert}>Insert</button>
        </div>
        <div>
          {messages.map((m, i) => <div key={i}>{JSON.stringify(m)}</div>)}
        </div>
      </article>
    );
  }
}
