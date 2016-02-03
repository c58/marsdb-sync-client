import 'babel-polyfill';
import {IndexRoute, Route, browserHistory, Router} from 'react-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { Random } from 'marsdb';
import MarsClient from 'marsdb-sync-client';
import TodoModel from './models/Todo.model';


class DDPTestComponent extends React.Component {
  state = {
    messages: ['Started'],
  };

  componentDidMount() {
    TodoModel.find({}, {sub: ['allTodos']}).observe((todos) => {
      console.log(todos);
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


ReactDOM.render(
  <DDPTestComponent />,
  document.getElementById('root')
);
