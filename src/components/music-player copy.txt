/** biome-ignore-all lint/correctness/useExhaustiveDependencies: nois */
"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// Tipos (os mesmos de antes)
type Track = {
  title: string;
  file: { url: string };
  trackImage?: { url: string };
};
type MusicPlayerProps = { playlist: Track[] };

export default function MusicPlayer({ playlist }: MusicPlayerProps) {
  // Estados existentes
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);

  // NOVOS ESTADOS
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<Track[]>([]);
  const [repeatMode, setRepeatMode] = useState<"off" | "one" | "all">("off");
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const audioRef = useRef<HTMLAudioElement>(null);
  const activePlaylist = isShuffled ? shuffledPlaylist : playlist;
  const currentTrack = activePlaylist[currentTrackIndex];

  // --- EFEITOS (useEffect) ---

  // Efeito para carregar o estado inicial do localStorage
  useEffect(() => {
    const savedTrackIndex = localStorage.getItem("lastTrackIndex");
    const savedVolume = localStorage.getItem("volume");
    if (savedTrackIndex) {
      setCurrentTrackIndex(Number(savedTrackIndex));
    }
    if (savedVolume) {
      setVolume(Number(savedVolume));
    }
  }, []);

  // Efeito para salvar o estado no localStorage
  useEffect(() => {
    localStorage.setItem("lastTrackIndex", String(currentTrackIndex));
    localStorage.setItem("volume", String(volume));
  }, [currentTrackIndex, volume]);

  // Efeito para controlar play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current
          .play()
          .catch((error) => console.error("Error playing audio:", error));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  // Efeito para criar a playlist aleatória
  useEffect(() => {
    if (isShuffled) {
      const shuffled = [...playlist].sort(() => Math.random() - 0.5);
      setShuffledPlaylist(shuffled);
    }
  }, [isShuffled, playlist]);

  // Efeito para atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Não interfere em inputs
      switch (e.code) {
        case "Space":
          e.preventDefault();
          handlePlayPause();
          break;
        case "ArrowRight":
          handleNext();
          break;

        case "ArrowLeft":
          handlePrev();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- FUNÇÕES DE CONTROLE ---

  const handleNext = useCallback(() => {
    if (repeatMode === "one") {
      audioRef.current!.currentTime = 0;
      audioRef.current!.play();
    } else {
      const nextIndex = (currentTrackIndex + 1) % activePlaylist.length;
      setCurrentTrackIndex(nextIndex);
    }
  }, [currentTrackIndex, activePlaylist.length, repeatMode]);

  const handlePrev = () => {
    const prevIndex =
      (currentTrackIndex - 1 + activePlaylist.length) % activePlaylist.length;
    setCurrentTrackIndex(prevIndex);
  };

  const handlePlayPause = () => setIsPlaying(!isPlaying);

  const onEnded = useCallback(() => {
    if (repeatMode === "one") {
      handleNext();
    } else if (repeatMode === "all") {
      handleNext();
    } else {
      // Se for a última música e repeat está 'off', para de tocar
      if (currentTrackIndex === activePlaylist.length - 1) {
        setIsPlaying(false);
      } else {
        handleNext();
      }
    }
  }, [repeatMode, currentTrackIndex, activePlaylist.length, handleNext]);

  const toggleRepeatMode = () => {
    const modes: ("off" | "one" | "all")[] = ["off", "all", "one"];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current)
      audioRef.current.currentTime = Number(event.target.value);
  };

  const formatTime = (time: number) =>
    new Date(time * 1000).toISOString().substr(14, 5);

  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(playlist.indexOf(activePlaylist[index]));
    setIsPlaying(true);
    setIsPlaylistOpen(false);
  };

  // NOVO: Filtragem da playlist para a busca
  const filteredPlaylist = activePlaylist.filter((track) =>
    track.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // NOVO: Handlers para o efeito 3D da capa
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setRotate({ x: -y * 20, y: x * 20 });
  };
  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  return (
    <>
      {/* Background Dinâmico com Efeito de Desfoque */}
      <AnimatePresence>
        <motion.div
          key={currentTrack?.file.url}
          className="fixed inset-0 w-full h-full z-[-1]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1 } }}
          exit={{ opacity: 0 }}
        >
          {currentTrack?.trackImage?.url ? (
            <Image
              src={currentTrack.trackImage.url}
              alt="background"
              fill
              style={{ objectFit: "cover" }}
              className="scale-110 filter blur-2xl"
            />
          ) : (
            <div className="w-full h-full bg-gray-800"></div>
          )}
          <div className="absolute inset-0 bg-black/50"></div>
        </motion.div>
      </AnimatePresence>

      {/* Container Principal do Player */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md rounded-2xl bg-black/30 backdrop-blur-xl text-white shadow-2xl p-6 flex flex-col space-y-4 border border-white/10"
      >
        {/** biome-ignore lint/a11y/useMediaCaption: nois */}
        <audio
          ref={audioRef}
          src={currentTrack?.file.url}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          volume={volume}
        />

        {/* Imagem com Animação */}
        <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTrack?.file.url}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.5 } }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0"
            >
              {currentTrack?.trackImage?.url ? (
                <Image
                  src={currentTrack.trackImage.url}
                  alt={currentTrack.title}
                  fill
                  style={{ objectFit: "cover" }}
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <Music2 size={80} className="text-gray-500" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Informações da Faixa */}
        <div className="text-center">
          <h2 className="text-2xl font-bold truncate">{currentTrack?.title}</h2>
          <p className="text-gray-300">Artista Desconhecido</p>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full">
          <input
            type="range"
            value={currentTime}
            max={duration || 0}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer range-sm accent-purple-500"
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controles Extras (Shuffle, Repeat, Playlist) */}
        <div className="flex justify-between items-center text-gray-300">
          <button
            type="button"
            onClick={() => setIsShuffled(!isShuffled)}
            className={`transition-colors ${isShuffled ? "text-purple-500" : "hover:text-white"}`}
          >
            <Shuffle size={22} />
          </button>
          <div className="flex-grow"></div> {/* Espaçador */}
          <button
            type="button"
            onClick={toggleRepeatMode}
            className="transition-colors hover:text-white"
          >
            {repeatMode === "one" ? (
              <Repeat1 className="text-purple-500" size={22} />
            ) : (
              <Repeat
                className={`${repeatMode === "all" ? "text-purple-500" : ""}`}
                size={22}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
            className={`ml-4 transition-colors ${isPlaylistOpen ? "text-purple-500" : "hover:text-white"}`}
          >
            <ListMusic size={22} />
          </button>
        </div>

        {/* Controles Principais */}
        <div className="flex items-center justify-center space-x-6">
          <button
            type="button"
            onClick={handlePrev}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <SkipBack size={28} />
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayPause}
            className="bg-purple-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-purple-500 transition-all scale-100 hover:scale-105"
          >
            {isPlaying ? (
              <Pause size={32} />
            ) : (
              <Play size={32} className="ml-1" />
            )}
          </motion.button>
          <button
            type="button"
            onClick={handleNext}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <SkipForward size={28} />
          </button>
        </div>

        {/* Controle de Volume */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setVolume((v) => (v > 0 ? 0 : 0.75))}
          >
            {volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer range-sm accent-purple-500"
          />
        </div>
      </motion.div>

      {/* Modal da Playlist */}
      <AnimatePresence>
        {isPlaylistOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 max-h-[70%] bg-black/50 backdrop-blur-xl p-4 rounded-t-2xl border-t border-white/10 flex flex-col"
          >
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Buscar na fila..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 rounded-lg p-3 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
            </div>
            <ul className="overflow-y-auto space-y-2">
              {activePlaylist.map((track, index) => (
                <li
                  key={String(index)}
                  onClick={() => selectTrack(index)}
                  onKeyDown={() => selectTrack(index)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${index === currentTrackIndex ? "bg-purple-600/50" : "hover:bg-white/10"}`}
                >
                  <div className="w-12 h-12 bg-gray-700 rounded-md mr-4 flex-shrink-0">
                    {track.trackImage?.url ? (
                      <Image
                        src={track.trackImage.url}
                        alt={track.title}
                        width={48}
                        height={48}
                        className="rounded-md"
                      />
                    ) : (
                      <Music2 className="text-gray-400 w-full h-full p-2" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold">{track.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
