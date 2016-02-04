import TodoModel from '../models/Todo.model';
import { publish } from 'marsdb-sync-server';


publish('allTodos', () =>
  TodoModel.find()
);
