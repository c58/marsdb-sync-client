import Collection from './Collection';

const TodoModel = new Collection('todos');
export default TodoModel;

TodoModel.insert({text: 'Todo #1', complete: false});
TodoModel.insert({text: 'Todo #2', complete: false});
TodoModel.insert({text: 'Todo #3', complete: false});
TodoModel.insert({text: 'Todo #4', complete: false});
TodoModel.insert({text: 'Todo #5', complete: false});
