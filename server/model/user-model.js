var mongoose = require("mongoose");
var bcrypt   = require("bcrypt-nodejs");

var schema = new mongoose.Schema({
	username: {
		type: String,
		unique: true,
		required: true
	},

	password: {
		type: String,
		required: true
	}
});

schema.statics.hashPassword = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

schema.methods.hashPassword = function(password){
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

schema.methods.verifyPassword = function(password) {
	return bcrypt.compareSync(password, this.password);
}

module.exports = mongoose.model("User", schema);