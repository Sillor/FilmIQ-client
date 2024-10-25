import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AnimatedBackground } from 'animated-backgrounds';

const TMDB_API_KEY = 'api';
const AI_SERVER_URL = 'http://localhost:5000/recommend';

const formatReleaseDate = (releaseDate) =>
  releaseDate ? releaseDate.split('-')[0] : 'N/A';

const SearchBar = ({ searchQuery, setSearchQuery }) => (
  <input
    type="text"
    placeholder="Search for a movie..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full p-4 border border-transparent rounded-md mb-6 bg-white/10 text-white focus:ring-2 focus:ring-blue-500 backdrop-blur-lg"
  />
);

const Tooltip = ({ movie }) => (
  <div className="absolute top-0 left-full ml-4 w-64 p-4 bg-gray-600/60 text-white rounded-lg shadow-lg backdrop-blur-3xl z-50">
    <h3 className="text-lg font-bold">{movie.title}</h3>
    <p className="text-sm text-gray-300">
      Release Year: {formatReleaseDate(movie.release_date)}
    </p>
    <p className="text-sm text-yellow-400">
      Rating: {movie.vote_average?.toFixed(1) || 'N/A'}
    </p>
    <p className="mt-2 text-sm">{movie.overview || 'No overview available'}</p>
  </div>
);

const MovieCard = ({ movie, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => onSelect && onSelect(movie)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-white/10 p-6 rounded-lg text-white shadow-lg transform transition duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer ${
        isSelected ? 'ring-4 ring-blue-500' : ''
      }`}
      style={{ zIndex: isHovered ? 10 : 1 }}
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
        <p className="text-sm text-gray-300 mb-1">
          {formatReleaseDate(movie.release_date)}
        </p>
        <p className="text-sm text-yellow-400">
          Rating: {movie.vote_average?.toFixed(1) || 'N/A'}
        </p>
      </div>
      {isHovered && <Tooltip movie={movie} />}
    </div>
  );
};

const SelectedMovies = ({ selectedMovies, onRemove }) => (
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-white mb-4">Selected Movies</h2>
    <div className="space-y-2">
      {selectedMovies.map((movie) => (
        <div
          key={movie.id}
          onClick={() => onRemove(movie)}
          className="flex items-center space-x-4 text-white cursor-pointer hover:bg-white/10 p-2 rounded transition backdrop-blur-lg"
        >
          <h3 className="text-lg font-bold">{movie.title}</h3>
          <p className="text-sm text-gray-300">
            {formatReleaseDate(movie.release_date)}
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

const App = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}`
        );
        setSearchResults(response.data.results);
      } catch (error) {
        console.error('Error fetching search results:', error);
      }
    };

    if (searchQuery) fetchMovies();
    else setSearchResults([]);
  }, [searchQuery]);

  const handleSelectMovie = useCallback((movie) => {
    setSelectedMovies((prevSelected) =>
      prevSelected.find((m) => m.id === movie.id)
        ? prevSelected.filter((m) => m.id !== movie.id)
        : [...prevSelected, movie]
    );
    setSearchQuery(''); // Clear search input
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const formattedMovies = selectedMovies.map((movie) => [
        movie.title,
        parseInt(movie.release_date.split('-')[0]),
      ]);

      const response = await axios.post(AI_SERVER_URL, {
        favorite_movies: formattedMovies,
        start_year: 1980,
        end_year: 2024,
        min_rating: 7,
        num_recommendations: 8,
        min_num_votes: 100000,
      });

      const recommendationsData = await Promise.all(
        response.data.recommendations.map(async (rec) => {
          const movieSearchResponse = await axios.get(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
              rec[0]
            )}`
          );
          return movieSearchResponse.data.results[0];
        })
      );

      setRecommendations(recommendationsData);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 relative overflow-hidden">
      <AnimatedBackground animationName="cosmicDust" />
      <div className="relative z-10 max-w-5xl mx-auto bg-white/10 backdrop-blur-lg p-8 rounded-lg shadow-lg">
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
          onRemove={(movie) =>
            setSelectedMovies((prev) => prev.filter((m) => m.id !== movie.id))
          }
        />
        <button
          onClick={fetchRecommendations}
          className="w-full bg-white/20 text-white font-semibold px-6 py-3 rounded-md hover:bg-white/30 backdrop-blur-lg transition duration-300 mb-4"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Get Recommendations'}
        </button>
        {recommendations.length > 0 && (
          <button
            onClick={() => setRecommendations([])}
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
