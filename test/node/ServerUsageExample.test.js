import MarsMeteor from 'marsdb-meteor';
import Collection from 'marsdb';


const BlogModel = new Collection('blog');
const UserModel = new Collection('users');
const CommentModel = new Collection('comments');

MarsMeteor.publish('allPosts', (userId) =>
  BlogModel.find({authorId: userId}).limit(10)
    .join(doc => [
      UserModel.find(doc.authorId, {fields: ['name']}),
      CommentModel.find({blogId: doc._id}).limit(10).observe()
    ]);
);
