$(async function() {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $('#all-articles-list');
	const $favoriteStories = $('#favorited-articles');
	const $ownStories = $('#my-articles');
	const $filteredArticles = $('#filtered-articles');
	const $navAddStory = $('#nav-add-story');
	const $submitForm = $('#submit-form');
	const $editForm = $('#edit-article-form');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $userProfile = $('#user-profile');

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();

	/**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

	$loginForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $('#login-username').val();
		const password = $('#login-password').val();

		// call the login static method to build a user instance
		try {
			var userInstance = await User.login(username, password);
		} catch (error) {
			console.error(`Bad user login request. - ${error.message}`);
			alert("That didn't work:/ Try again!");
			return null;
		}
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
		addStoriesToDOM();
	});

	/**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

	$createAccountForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();

		// call the create method, which calls the API and then builds a new user instance
		try {
			var newUser = await User.create(username, password, name);
		} catch (error) {
			console.error(`Bad create user request. - ${error.message}`);
			alert("That didn't work:/ Try again!");
			return null;
		}
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
   *  Event listener for showing submit 
   *  new story form.
   */

	$navAddStory.on('click', function(evt) {
		evt.preventDefault();
		$submitForm.slideDown();
		$editForm.slideUp();
	});

	/**
   *  Event listener for hiding submit story form.
   */

	$('#close-sumbit-form').on('click', function(evt) {
		evt.preventDefault();
		console.log('poo');
		$submitForm.slideUp();
	});

	/**
   *  Event listener for submitting new story.
   *  If successfully we append story to DOM.
   */

	$submitForm.on('submit', async function(evt) {
		evt.preventDefault();

		// grab the required fields
		let author = $('#author').val();
		let title = $('#title').val();
		let url = $('#url').val();

		// call the addStory method, which calls the API and then creates a new story
		try {
			var newStory = await storyList.addStory(currentUser.loginToken, { author, title, url });
		} catch (error) {
			console.error(`Bad create story request. - ${error.message}`);
			alert("That didn't work:/ Try again!");
			return null;
		}
		// tried to have things updated without additonal API calls
		$allStoriesList.prepend(generateStoryHTML(newStory));
		currentUser.ownStories.push(newStory);
		// reset and change to all stories view
		$('#submit-form').trigger('reset');
		hideElements();
		toggleAllStories();
	});

	/**
   *  Event listener for adding or removing a favorite.
   */

	$('.articles-container').on('click', '.article-favorite', async function(evt) {
		evt.preventDefault();
		if (currentUser === null) {
			showLoginSignup();
			return null;
		}
		// get story ID for story to favorite
		const storyId = $(this).parent().attr('id');

		try {
			await currentUser.updateFavorite(storyId);
		} catch (error) {
			console.error(`Bad favorite story request. - ${error.message}`);
			return null;
		}
		// show story being favorited/un-fav. in whatever view is showing
		addStoriesToDOM();
		addFavoritesToDOM();
		addMyStoriesToDOM();
	});

	/**
   *  Event listener for showing story editing form.
   */

	$('.articles-container').on('click', '.article-edit', function(evt) {
		evt.preventDefault();
		// get story ID for story to edit
		const storyId = $(this).parent().attr('id');
		// set story edit form hidden value to storyId
		$('#edit-form-storyId').val(storyId);
		// get story obj
		const editStory = storyList.stories.filter(story => story.storyId === storyId)[0];
		// enter pervious title value
		$('#edit-title').val(editStory.title);
		$submitForm.slideUp();
		$editForm.slideDown();
	});

	/**
   *  Event listener for hiding story editing form.
   */

	$('#close-edit-form').on('click', function(evt) {
		evt.preventDefault();
		$editForm.slideUp();
	});

	/**
   *  Event listener for editing a story.
   */

	$editForm.on('submit', async function(evt) {
		evt.preventDefault();
		// get story ID for story to edit from hidden value.
		const storyId = $('#edit-form-storyId').val();
		// get value for title
		const title = $('#edit-title').val();
		// see if title value has changed. If not return.
		const editStory = storyList.stories.filter(story => story.storyId === storyId)[0];
		if (editStory.title === title) return null;

		// call the editStory method, which calls the API to edit a story
		try {
			var res = await storyList.editStory(currentUser.loginToken, storyId, { title });
		} catch (error) {
			console.error(`Bad edit story request. - ${error.message}`);
			alert("That didn't work:/ Try again!");
			return null;
		}
		alert(`updated at ${res.data.story.updatedAt}`);
		// update user obj so updated title in favs and ownStories
		currentUser = await User.getLoggedInUser(currentUser.loginToken, currentUser.username);
		// show edited title in whatever view is showing
		addStoriesToDOM();
		addFavoritesToDOM();
		addMyStoriesToDOM();
		$editForm.slideToggle();
	});

	/**
   *  Event listener for deleting story.
   *  ToDo: add form to confirm delete.
   */

	$('.articles-container').on('click', '.article-delete', async function(evt) {
		evt.preventDefault();
		const storyId = $(this).parent().attr('id');

		// call the deleteStory method, which calls the API and then deletes a story
		try {
			var res = await storyList.deleteStory(currentUser, storyId);
		} catch (error) {
			console.error(`Bad delete story request. - ${error.message}`);
			alert("That didn't work:/ Try again!");
			return null;
		}
		alert(res);
		// update user obj so deleted story removed in favs and ownStories
		currentUser = await User.getLoggedInUser(currentUser.loginToken, currentUser.username);
		// show story is gone in whatever view is showing
		addStoriesToDOM();
		addFavoritesToDOM();
		addMyStoriesToDOM();
	});

	/**
   * Log Out Functionality
   */

	$navLogOut.on('click', function() {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory // <--#note
		location.reload();
	});

	/**
   * Event Handler for Clicking Login
   * Show/hide the Login and Create Account Forms/ Stories
   */

	$navLogin.on('click', function(evt) {
		evt.preventDefault();
		showLoginSignup();
	});

	function showLoginSignup() {
		// When hiding forms and showing stories delay showing stories.
		if ($allStoriesList.attr('style') === 'display: none;') {
			$loginForm.slideToggle();
			$createAccountForm.slideToggle(400, toggleAllStories);
			return null;
		}
		// When showing forms and hiding stories execute all at once.
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		toggleAllStories();
	}

	/**
   * Function to toggle the allStoriesList.
   */
	function toggleAllStories() {
		$allStoriesList.toggle();
	}

	/**
   * Event handler for Navigation to Homepage
   */

	$('body').on('click', '#nav-all', async function() {
		hideElements();
		await generateStories();
		$allStoriesList.show();
	});

	/**
   * Event handler for showing favorites view
   */

	$('#nav-favorites').on('click', function() {
		addFavoritesToDOM();
		hideElements();
		$favoriteStories.show();
	});

	/**
   * Event handler for showing my stories view
   */

	$('#nav-my-stories').on('click', function() {
		addMyStoriesToDOM();
		hideElements();
		$ownStories.show();
	});

	/**
   * Event handler for showing user info
   */

	$('#nav-user-profile').on('click', function() {
		$('#profile-name').text(`Name: ${currentUser.name}`);
		$('#profile-username').text(`Userame: ${currentUser.username}`);
		$('#profile-account-date').text(`Account Created: ${currentUser.createdAt}`);

		// When hiding info and showing stories delay showing stories.
		if ($userProfile.hasClass('showing')) {
			$userProfile.slideToggle(400, toggleAllStories);
			$userProfile.removeClass('showing');
			return null;
		}
		// When showing info and hiding stories execute all at once.
		hideElements();
		$userProfile.slideToggle();
		$userProfile.addClass('showing');
	});

	/**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
		}
	}

	/**
   * A rendering function to run to reset the forms and hide the login info
   */

	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();
	}

	/**
   * A function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

	async function generateStories() {
		// get an instance of StoryList
		try {
			var storyListInstance = await StoryList.getStories();
		} catch (error) {
			console.error(`Bad get stories request. - ${error.message}`);
			alert('API down:/\nTry again by refeshing page or clicking "hack or snooze"!');
			return null;
		}
		// update our global variable
		storyList = storyListInstance;
		// add stories to DOM
		addStoriesToDOM();
	}

	/**
   * A rendering function for the StoryList.
   */

	function addStoriesToDOM() {
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}
	/**
   * A rendering function for the user favorites list.
   */

	function addFavoritesToDOM() {
		if (currentUser.favorites.length === 0) {
			$favoriteStories.html('<li class="article-empty"><strong>No stories added by user yet!</strong></li>');
			return null;
		}
		// empty out that part of the page
		$favoriteStories.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of currentUser.favorites) {
			const result = generateStoryHTML(story);
			$favoriteStories.append(result);
		}
	}
	/**
   * A rendering function for the user my stories list.
   */

	function addMyStoriesToDOM() {
		if (currentUser.ownStories.length === 0) {
			$ownStories.html('<li class="article-empty"><strong>No stories added by user yet!</strong></li>');
			return null;
		}
		// empty out that part of the page
		$ownStories.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of currentUser.ownStories) {
			const result = generateStoryHTML(story);
			$ownStories.append(result);
		}
	}

	/**
   * A function to render HTML for an individual Story instance
   */

	function generateStoryHTML(story) {
		let hostName = getHostName(story.url),
			yellow = '',
			hidden = 'hidden';
		// If this user favorited this story show star yellow.
		if (currentUser && currentUser.favorites.some(fav => story.storyId === fav.storyId)) {
			yellow = 'yellow-star';
		}
		// If this user is creator of story show edit and delete buttons.
		if (currentUser && currentUser.username === story.username) {
			hidden = '';
		}
		// create jquery object from html.
		return $(`
	  <li id="${story.storyId}">
		<a href="" class="article-favorite star ${yellow}">
			<i class="far fa-star"></i>
		</a>	
		<a class="article-edit pencil ${hidden}">
			<i class="fas fa-edit"></i>
        </a>
        <a class="article-delete trash-can ${hidden}">
			<i class="fas fa-trash-alt"></i>
        </a>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
	}

	/**
   * hide all elements in elementsArr
   */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$editForm,
			$allStoriesList,
			$favoriteStories,
			$filteredArticles,
			$ownStories,
			$loginForm,
			$createAccountForm,
			$userProfile
		];
		elementsArr.forEach($elem => $elem.hide());
		$userProfile.removeClass('showing');
	}

	/**
   *  show appropriate options for logged in user.
   */
	function showNavForLoggedInUser() {
		$navLogin.hide();
		$navLogOut.show();
		$('.nav-when-logged-in').show();
		$('#nav-user-profile').html(`<small>${currentUser.username}</small>`);
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		} else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}
});
