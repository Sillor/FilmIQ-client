import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const TMDB_API_KEY = 'api'; // Replace with your TMDB API key
const AI_SERVER_URL = 'http://localhost:5000/recommend'; // Adjust with your AI server URL

// Search Bar Component
const SearchBar = ({ searchQuery, setSearchQuery }) => (
  <input
    type="text"
    placeholder="Search for a movie..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full p-4 border border-gray-500 rounded-md mb-6 bg-gray-700 text-white focus:ring-2 focus:ring-purple-500"
  />
);

const Tooltip = ({ movie }) => (
  <div className="absolute top-0 left-full ml-4 w-64 p-4 bg-gray-800 text-white rounded-lg shadow-lg z-50">
    <h3 className="text-lg font-bold">{movie.title}</h3>
    <p className="text-sm text-gray-400">
      Release Year:{' '}
      {movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
    </p>
    <p className="text-sm text-yellow-400">
      Rating: {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
    </p>
    <p className="mt-2 text-sm">
      {movie.overview ? movie.overview : 'No overview available'}
    </p>
  </div>
);

const fetchMovieDetails = async (movieId, setMovieDetails) => {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`
    );
    setMovieDetails(response.data); // Set the full movie details, including overview
  } catch (error) {
    console.error('Error fetching movie details:', error);
  }
};

// Reusable MovieCard Component with Tooltip
const MovieCard = ({ movie, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [movieDetails, setMovieDetails] = useState(movie); // Default to initial movie data

  useEffect(() => {
    if (isHovered && !movie.overview) {
      // Fetch movie details if the overview is missing
      fetchMovieDetails(movie.id, setMovieDetails);
    }
  }, [isHovered, movie]);

  return (
    <div
      onClick={() => onSelect && onSelect(movie)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-gray-700 p-6 rounded-lg text-white shadow-lg transform transition duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer ${
        isSelected ? 'ring-4 ring-purple-500' : ''
      }`}
      style={{ zIndex: isHovered ? 10 : 1 }} // Ensure MovieCard comes to front on hover
    >
      {movie.poster_path && (
        <img
          src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
          alt={movie.title}
          className="w-full h-auto rounded-lg mb-4 object-cover"
        />
      )}
      <div className="flex flex-col items-start">
        <h3 className="text-lg font-bold mb-1">{movie.title}</h3>
        <p className="text-sm text-gray-400 mb-1">
          {movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
        </p>
        <p className="text-sm text-yellow-400">
          Rating: {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
        </p>
      </div>
      {isHovered && <Tooltip movie={movieDetails} />}
    </div>
  );
};

// Selected Movies Component
const SelectedMovies = ({ selectedMovies, onRemove }) => (
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-white mb-4">Selected Movies</h2>
    <div className="space-y-2">
      {selectedMovies.map((movie) => (
        <div
          key={movie.id}
          onClick={() => onRemove(movie)} // Remove movie when clicked
          className="flex items-center space-x-4 text-white cursor-pointer hover:bg-gray-600 p-2 rounded transition"
        >
          <h3 className="text-lg font-bold">{movie.title}</h3>
          <p className="text-sm text-gray-400">
            {movie.release_date.split('-')[0]}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const Recommendations = ({ recommendations }) =>
  recommendations.length > 0 && (
    <div className="mt-10">
      <h2 className="text-2xl font-semibold text-white mb-6">
        Recommendations
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recommendations.map((movie, index) => (
          <MovieCard key={index} movie={movie} />
        ))}
      </div>
    </div>
  );

// Helper function for fetching movies
const fetchMovies = async (searchQuery, setSearchResults) => {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}`
    );
    setSearchResults(response.data.results);
  } catch (error) {
    console.error('Error fetching search results:', error);
  }
};

// Helper function for fetching movie recommendations
const fetchMovieRecommendations = async (
  selectedMovies,
  setRecommendations
) => {
  try {
    const formattedMovies = selectedMovies.map((movie) => [
      movie.title,
      parseInt(movie.release_date.split('-')[0]),
    ]);

    // Step 2: Fetch recommendations from AI server
    const response = await axios.post(AI_SERVER_URL, {
      favorite_movies: formattedMovies,
      start_year: 1980,
      end_year: 2024,
      min_rating: 7,
      num_recommendations: 8,
      min_num_votes: 100000,
    });

    // Step 3: Fetch detailed movie data for each recommendation from TMDB
    const recommendationsData = await Promise.all(
      response.data.recommendations.map(async (rec) => {
        const movieSearchResponse = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
            rec[0]
          )}`
        );
        const movieData = movieSearchResponse.data.results[0]; // Get the first result

        // Return the detailed movie data
        return {
          id: movieData.id,
          title: movieData.title,
          release_date: movieData.release_date,
          poster_path: movieData.poster_path,
          vote_average: movieData.vote_average,
          overview: movieData.overview,
        };
      })
    );

    setRecommendations(recommendationsData); // Step 4: Update state with full movie details
  } catch (error) {
    console.error('Error fetching recommendations:', error);
  }
};

const App = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (searchQuery) {
      fetchMovies(searchQuery, setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Add or remove movies from selected list
  const handleSelectMovie = useCallback((movie) => {
    setSelectedMovies((prevSelected) =>
      prevSelected.find((m) => m.id === movie.id)
        ? prevSelected.filter((m) => m.id !== movie.id)
        : [...prevSelected, movie]
    );
    setSearchQuery(''); // Clear search input after selecting a movie
    setSearchResults([]); // Clear search results
  }, []);

  // Remove movie from selected list
  const handleRemoveMovie = useCallback((movie) => {
    setSelectedMovies((prevSelected) =>
      prevSelected.filter((m) => m.id !== movie.id)
    );
  }, []);

  // Clear recommendations
  const handleClearRecommendations = () => {
    setRecommendations([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-900 to-gray-900 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          FilmIQ
        </h1>

        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {searchResults.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              isSelected={!!selectedMovies.find((m) => m.id === movie.id)}
              onSelect={handleSelectMovie}
            />
          ))}
        </div>

        <SelectedMovies
          selectedMovies={selectedMovies}
          onRemove={handleRemoveMovie}
        />

        <button
          onClick={() =>
            fetchMovieRecommendations(selectedMovies, setRecommendations)
          }
          className="w-full bg-purple-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-purple-700 transition duration-300 mb-4"
        >
          Get Recommendations
        </button>

        {recommendations.length > 0 && (
          <button
            onClick={handleClearRecommendations}
            className="w-full bg-gray-500 text-white font-semibold px-6 py-3 rounded-md hover:bg-gray-600 transition duration-300 mb-4"
          >
            Clear Recommendations
          </button>
        )}

        <Recommendations recommendations={recommendations} />
      </div>
    </div>
  );
};

export default App;
