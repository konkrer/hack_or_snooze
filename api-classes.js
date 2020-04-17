const BASE_URL = 'https://hack-or-snooze-v3.herokuapp.com';

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
	constructor(stories) {
		this.stories = stories;
	}

	/**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

	// TODO: Note the presence of `static` keyword: this indicates that getStories
	// is **not** an instance method. Rather, it is a method that is called on the
	// class directly. Why doesn't it make sense for getStories to be an instance method?

	static async getStories() {
		// GET query the /stories endpoint (no auth required)
		const response = await axios.get(`${BASE_URL}/stories`);

		// turn the plain old story objects from the API into instances of the Story class
		const stories = response.data.stories.map(story => new Story(story));

		// build an instance of our own class using the new array of stories
		const storyList = new StoryList(stories);
		return storyList;
	}

	/**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

	async addStory(user, story) {
		// POST request.
		const res = await axios.post(`${BASE_URL}/stories`, {
			token : user.loginToken,
			story
		});
		// Make Story, add to storyList, and return Story. Avoid new API call.
		const newStory = new Story(res.data.story);
		this.stories.unshift(newStory);
		return newStory;
	}

	/**
   * Method to make a PATCH request to /stories and update a story.
   * - user - the current instance of User who posted the story
   * - storyId - a story ID to be deleted
   * - storyData - any data to be updated
   *
   * Returns the new story object
   */

	async editStory(user, storyId, story) {
		// PATCH request.
		const res = await axios.patch(`${BASE_URL}/stories/${storyId}`, {
			token : user.loginToken,
			story
		});
		// make stories current. avoided new API call.
		let oldStoryIdx = this.stories.findIndex(story => story.storyId === storyId);
		this.stories[oldStoryIdx] = new Story(res.data.story);
		return res;
	}

	/**
   * Method to make a DELETE request to /stories and delete a story from the list
   * - user - the current instance of User who posted the story
   * - storyId - a story ID to be deleted
   */

	async deleteStory(user, storyId) {
		const token = user.loginToken;
		// DELETE request.
		const res = await axios.delete(`${BASE_URL}/stories/${storyId}`, {
			data : { token }
		});
		// remove deleted story from this.stories. avoided API call.
		const toDeleteIdx = this.stories.findIndex(story => story.storyId === storyId);
		this.stories.splice(toDeleteIdx, 1);
		return res.data.message;
	}
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
	constructor(userObj) {
		this.username = userObj.username;
		this.name = userObj.name;
		this.createdAt = userObj.createdAt;
		this.updatedAt = userObj.updatedAt;

		// these are all set to defaults, not passed in by the constructor
		this.loginToken = '';
		this.favorites = [];
		this.ownStories = [];
	}

	/* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

	static async create(username, password, name) {
		const response = await axios.post(`${BASE_URL}/signup`, {
			user : {
				username,
				password,
				name
			}
		});

		// build a new User instance from the API response
		const newUser = new User(response.data.user);

		// attach the token to the newUser instance for convenience
		newUser.loginToken = response.data.token;

		return newUser;
	}

	/* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

	static async login(username, password) {
		const response = await axios.post(`${BASE_URL}/login`, {
			user : {
				username,
				password
			}
		});

		// build a new User instance from the API response
		const existingUser = new User(response.data.user);

		// instantiate Story instances for the user's favorites and ownStories
		existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
		existingUser.ownStories = response.data.user.stories.map(s => new Story(s));

		// attach the token to the newUser instance for convenience
		existingUser.loginToken = response.data.token;

		return existingUser;
	}

	/** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

	static async getLoggedInUser(token, username) {
		// if we don't have user info, return null
		if (!token || !username) return null;

		// call the API
		const response = await axios.get(`${BASE_URL}/users/${username}`, {
			params : {
				token
			}
		});

		// instantiate the user from the API information
		const existingUser = new User(response.data.user);

		// attach the token to the newUser instance for convenience
		existingUser.loginToken = token;

		// instantiate Story instances for the user's favorites and ownStories
		existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
		existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
		return existingUser;
	}

	/** Add to favorites list.
   *
   * This function
   */

	async updateFavorite(storyId) {
		let token = this.loginToken,
			username = this.username;
		// if we don't have user info, return null
		if (!token || !username) return null;

		// if favorited remove. if not favorited add to favorites.
		if (this.favorites.some(fav => storyId === fav.storyId)) {
			var response = await axios.delete(`${BASE_URL}/users/${username}/favorites/${storyId}`, {
				data : { token }
			});
		} else {
			var response = await axios.post(`${BASE_URL}/users/${username}/favorites/${storyId}`, {
				token
			});
		}
		// instantiate Story instances for the user's favorites
		this.favorites = response.data.user.favorites.map(s => new Story(s));
	}
}

/**
 * Class to represent a single story.
 */

class Story {
	/**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

	constructor(storyObj) {
		this.author = storyObj.author;
		this.title = storyObj.title;
		this.url = storyObj.url;
		this.username = storyObj.username;
		this.storyId = storyObj.storyId;
		this.createdAt = storyObj.createdAt;
		this.updatedAt = storyObj.updatedAt;
	}
}
