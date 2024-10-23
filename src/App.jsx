import React, { useState } from 'react';
import axios from 'axios';

const TMDB_API_KEY = 'api'; // Replace with your TMDB API key
const AI_SERVER_URL = 'http://localhost:5000/recommend'; // Adjust with your AI server URL

const App = () => {
  const [favoriteMovies, setFavoriteMovies] = useState([['', '']]); // Array of arrays for movie titles and years
  const [startYear, setStartYear] = useState(1990);
  const [endYear, setEndYear] = useState(2020);
  const [minRating, setMinRating] = useState(7);
  const [minVotes, setMinVotes] = useState(100000);
  const [numRecommendations, setNumRecommendations] = useState(5);
  const [recommendations, setRecommendations] = useState([]);
  const [movieDetails, setMovieDetails] = useState([]);

  // Add an empty movie input
  const handleAddMovie = () => {
    setFavoriteMovies([...favoriteMovies, ['', '']]); // Add new empty movie [title, year]
  };

  // Handle change for both title and year
  const handleMovieChange = (index, field, value) => {
    const updatedMovies = [...favoriteMovies];

    if (field === 'title') {
      updatedMovies[index][0] = value; // Title is index 0
    } else if (field === 'year') {
      updatedMovies[index][1] = value; // Year is index 1
    }

    setFavoriteMovies(updatedMovies);
  };

  // Fetch movie details from TMDB API
  const getMovieDetails = async (movieTitle) => {
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${movieTitle}`
      );
      // Return the first movie result (assuming the movie title is unique enough)
      return response.data.results[0];
    } catch (error) {
      console.error(`Error fetching details for ${movieTitle}:`, error);
      return null;
    }
  };

  // Fetch movie recommendations from AI server
  const fetchMovieRecommendations = async () => {
    try {
      // Ensure the year fields are integers before sending the request
      const formattedMovies = favoriteMovies
        .filter((movie) => movie[0] && movie[1]) // Ensure only non-empty entries are sent
        .map((movie) => [movie[0], parseInt(movie[1])]); // Parse the year as an integer

      const response = await axios.post(AI_SERVER_URL, {
        favorite_movies: formattedMovies, // Send movies with integer years
        start_year: parseInt(startYear), // Ensure startYear is an integer
        end_year: parseInt(endYear), // Ensure endYear is an integer
        min_rating: minRating,
        min_num_votes: minVotes,
        num_recommendations: numRecommendations,
      });

      const recommendations = response.data.recommendations;
      setRecommendations(recommendations);

      const detailedMovies = await Promise.all(
        recommendations.map(async ([title]) => {
          const details = await getMovieDetails(title);
          return details;
        })
      );
      setMovieDetails(detailedMovies);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  return (
    <div>
      <h1>Movie Recommender</h1>
      <div>
        {favoriteMovies.map((movie, index) => (
          <div key={index}>
            <input
              type="text"
              placeholder="Movie Title"
              value={movie[0]} // Title is at index 0 in the array
              onChange={(e) =>
                handleMovieChange(index, 'title', e.target.value)
              }
            />
            <input
              type="number"
              placeholder="Year"
              value={movie[1]} // Year is at index 1 in the array
              onChange={(e) => handleMovieChange(index, 'year', e.target.value)}
            />
          </div>
        ))}
        <button onClick={handleAddMovie}>Add Movie</button>
      </div>

      <div>
        <label>Start Year: </label>
        <input
          type="number"
          value={startYear}
          onChange={(e) => setStartYear(e.target.value)}
        />
        <label>End Year: </label>
        <input
          type="number"
          value={endYear}
          onChange={(e) => setEndYear(e.target.value)}
        />
        <label>Min Rating: </label>
        <input
          type="number"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
        />
        <label>Min Number of Votes: </label>
        <input
          type="number"
          value={minVotes}
          onChange={(e) => setMinVotes(e.target.value)}
        />
        <label>Number of Recommendations: </label>
        <input
          type="number"
          value={numRecommendations}
          onChange={(e) => setNumRecommendations(e.target.value)}
        />
        <button onClick={fetchMovieRecommendations}>Get Recommendations</button>
      </div>

      <div>
        <h2>Recommendations</h2>
        {movieDetails.length > 0 ? (
          movieDetails.map((movie, index) => (
            <div key={index}>
              <h3>
                {movie.title} ({movie.release_date.split('-')[0]})
              </h3>
              <p>{movie.overview}</p>
              <img
                src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                alt={movie.title}
              />
            </div>
          ))
        ) : (
          <p>No recommendations yet</p>
        )}
      </div>
    </div>
  );
};

export default App;
