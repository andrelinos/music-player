/** biome-ignore-all lint/correctness/useExhaustiveDependencies: nois */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: <explanation> */
/** biome-ignore-all lint/correctness/noInvalidUseBeforeDeclaration: <explanation> */
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
  VolumeX,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// Tipos
type Track = {
  title: string;
  file: { url: string };
  trackImage?: { url: string };
};
type MusicPlayerProps = { playlist: Track[] };

// Skeleton
const PlayerSkeleton = () => (
  <div className="w-full max-w-md rounded-2xl bg-black/40 backdrop-blur-2xl text-white shadow-2xl p-6 flex flex-col space-y-4 border border-white/10 animate-pulse">
    <div className="relative w-full aspect-square rounded-xl bg-white/10"></div>
    <div className="h-8 rounded bg-white/10 w-3/4 mx-auto"></div>
    <div className="h-20 rounded bg-white/10"></div>
    <div className="h-2 rounded bg-white/10 w-full"></div>
    <div className="flex justify-center items-center space-x-6 h-16">
      <div className="w-10 h-10 rounded-full bg-white/10"></div>
      <div className="w-16 h-16 rounded-full bg-purple-500/50"></div>
      <div className="w-10 h-10 rounded-full bg-white/10"></div>
    </div>
  </div>
);

export default function MusicPlayer({ playlist }: MusicPlayerProps) {
  // --- ESTADOS ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<Track[]>([]);
  const [repeatMode, setRepeatMode] = useState<"off" | "one" | "all">("off");
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  // --- REFS ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // --- DADOS DERIVADOS ---
  const activePlaylist = isShuffled ? shuffledPlaylist : playlist;
  const currentTrack = activePlaylist?.[currentTrackIndex];

  // --- FUNÇÃO AUXILIAR PARA O VISUALIZADOR ---
  const initializeAudioContext = () => {
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const context = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      const source = context.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(context.destination);
      audioContextRef.current = context;
      analyserRef.current = analyser;
    } catch (error) {
      console.error("Erro ao inicializar o AudioContext:", error);
    }
  };

  // ====================================================================
  // EFEITO PRINCIPAL: O "CÉREBRO" DO PLAYER
  // Gerencia o estado do elemento <audio> baseado no estado do React.
  // ====================================================================
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.file?.url) return;

    console.log("URL SENDO USADA PELO PLAYER:", currentTrack.file.url);

    const proxyUrl = `/api/proxy?url=${encodeURIComponent(currentTrack.file.url)}`;

    // 1. Se a música mudou, atualiza o 'src' e carrega o novo áudio.
    if (audio.src !== proxyUrl) {
      audio.src = proxyUrl;
      audio.load();
    }

    // 2. Sincroniza o estado de play/pause.
    if (isPlaying) {
      // Garante que o contexto de áudio seja criado na primeira interação.
      if (!audioContextRef.current) {
        initializeAudioContext();
      }
      // Navegadores modernos podem suspender o contexto, precisamos retomá-lo.
      audioContextRef.current?.resume();

      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch((error) => {
          // Ignora o erro "AbortError" que acontece quando o usuário troca de música rapidamente.
          if (error.name !== "AbortError") {
            console.error("Erro ao tentar tocar o áudio:", error);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  // --- EFEITOS SECUNDÁRIOS ---

  // Efeito para carregar e salvar no localStorage (consolidado)
  useEffect(() => {
    const savedTrackIndex = localStorage.getItem("lastTrackIndex");
    const savedVolume = localStorage.getItem("volume");
    if (
      savedTrackIndex &&
      playlist.length > 0 &&
      Number(savedTrackIndex) < playlist.length
    ) {
      setCurrentTrackIndex(Number(savedTrackIndex));
    }
    if (savedVolume) {
      setVolume(Number(savedVolume));
    }
  }, [playlist]); // Executa apenas quando a playlist é carregada

  useEffect(() => {
    localStorage.setItem("lastTrackIndex", String(currentTrackIndex));
    localStorage.setItem("volume", String(volume));
  }, [currentTrackIndex, volume]);

  // Efeito para embaralhar a playlist
  // useEffect(() => {
  //   if (isShuffled) {
  //     setShuffledPlaylist([...playlist].sort(() => Math.random() - 0.5));
  //   } else {
  //     const originalIndex = playlist.findIndex(
  //       (track) => track.file.url === currentTrack?.file.url,
  //     );
  //     if (originalIndex !== -1) {
  //       setCurrentTrackIndex(originalIndex);
  //     }
  //   }
  // }, [isShuffled, playlist]);

  // Efeito para o loop de animação do visualizador
  useEffect(() => {
    let animationFrameId: number;
    const visualizerLoop = () => {
      if (analyserRef.current && canvasRef.current && isPlaying) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 1.5;
        let x = 0;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#a855f7");
        gradient.addColorStop(0.5, "#ec4899");
        gradient.addColorStop(1, "#f59e0b");
        ctx.fillStyle = gradient;

        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 2;
        }
      }
      animationFrameId = requestAnimationFrame(visualizerLoop);
    };

    visualizerLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // --- FUNÇÕES DE CONTROLE (Simplificadas para apenas alterar o estado) ---

  // NOVO: Função para controlar o modo aleatório
  const handleToggleShuffle = () => {
    const newShuffleState = !isShuffled;
    const currentlyPlayingUrl = currentTrack?.file.url;

    setIsShuffled(newShuffleState);

    if (newShuffleState) {
      // Ao LIGAR o aleatório
      const newShuffledList = [...playlist].sort(() => Math.random() - 0.5);
      setShuffledPlaylist(newShuffledList);

      // Começa a tocar a primeira música da nova lista aleatória
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    } else {
      // Ao DESLIGAR o aleatório
      // Encontra a música que estava tocando na playlist original
      const originalIndex = playlist.findIndex(
        (track) => track.file.url === currentlyPlayingUrl,
      );
      if (originalIndex !== -1) {
        setCurrentTrackIndex(originalIndex);
      }
    }
  };

  const handlePlayPause = () => {
    if (!currentTrack) return;
    setIsPlaying(!isPlaying);
  };

  const handleNext = useCallback(() => {
    if (activePlaylist.length > 0) {
      const nextIndex = (currentTrackIndex + 1) % activePlaylist.length;
      setCurrentTrackIndex(nextIndex);
      setIsPlaying(true);
    }
  }, [currentTrackIndex, activePlaylist.length]);

  const handlePrev = useCallback(() => {
    if (activePlaylist.length > 0) {
      const prevIndex =
        (currentTrackIndex - 1 + activePlaylist.length) % activePlaylist.length;
      setCurrentTrackIndex(prevIndex);
      setIsPlaying(true);
    }
  }, [currentTrackIndex, activePlaylist.length]);

  const onEnded = useCallback(() => {
    if (repeatMode === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === "all") {
      handleNext();
    } else {
      if (currentTrackIndex < activePlaylist.length - 1) {
        handleNext();
      } else {
        setIsPlaying(false); // Para na última música
      }
    }
  }, [repeatMode, currentTrackIndex, activePlaylist.length, handleNext]);

  // Efeito para atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
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
  }, [handleNext, handlePrev]);

  // --- FUNÇÕES DE UTILIDADE E MANIPULADORES DE EVENTOS ---
  const toggleRepeatMode = () => {
    const modes: ("off" | "one" | "all")[] = ["off", "all", "one"];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Number(event.target.value);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    return new Date(time * 1000).toISOString().substr(14, 5);
  };

  const selectTrack = (indexInFilteredList: number) => {
    const clickedTrack = filteredPlaylist[indexInFilteredList];
    const originalIndex = activePlaylist.findIndex(
      (track) => track.file.url === clickedTrack.file.url,
    );
    if (originalIndex !== -1) {
      setCurrentTrackIndex(originalIndex);
      setIsPlaying(true);
      setIsPlaylistOpen(false);
    }
  };

  const filteredPlaylist = activePlaylist.filter((track) =>
    track.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setRotate({ x: -y * 20, y: x * 20 });
  };
  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  // --- RENDERIZAÇÃO ---
  if (!playlist || playlist.length === 0 || !currentTrack) {
    return <PlayerSkeleton />;
  }

  return (
    <>
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
              className="scale-110 filter blur-2xl brightness-50"
            />
          ) : (
            <div className="w-full h-full bg-gray-800"></div>
          )}
          <div className="absolute inset-0 bg-black/50"></div>
        </motion.div>
      </AnimatePresence>

      <motion.div
        className="w-full max-w-md"
        animate={{
          scale: isPlaylistOpen ? 0.95 : 1,
          y: isPlaylistOpen ? -20 : 0,
        }}
      >
        <div className="rounded-2xl bg-black/40 backdrop-blur-2xl text-white shadow-2xl p-6 flex flex-col space-y-4 border border-white/10">
          <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: "1000px" }}
            className="relative w-full aspect-square rounded-xl overflow-hidden shadow-lg"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack?.file.url}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.5 },
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  rotateX: rotate.x,
                  rotateY: rotate.y,
                  transition: "transform 0.1s ease-out",
                }}
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
          </motion.div>

          <div className="text-center">
            <h2 className="text-2xl font-bold truncate">
              {currentTrack?.title}
            </h2>
          </div>

          <div className="w-full h-20">
            <canvas
              ref={canvasRef}
              width="1000"
              height="150"
              className="w-full h-full"
            />
          </div>

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

          <div className="flex justify-between items-center text-gray-300">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleShuffle}
              className={`transition-colors ${isShuffled ? "text-purple-500" : "hover:text-white"}`}
            >
              <Shuffle size={22} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
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
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
              className={`transition-colors ${isPlaylistOpen ? "text-purple-500" : "hover:text-white"}`}
            >
              <ListMusic size={22} />
            </motion.button>
          </div>

          <div className="flex items-center justify-center space-x-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrev}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <SkipBack size={28} />
            </motion.button>
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
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <SkipForward size={28} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {isPlaylistOpen && (
        <AnimatePresence>
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 max-h-[70%] bg-black/50 backdrop-blur-xl p-4 rounded-t-2xl border-t border-white/10 flex flex-col"
          >
            <div className="flex gap-4 w-full items-center">
              <div className="relative flex-1 mb-4">
                <input
                  type="search"
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
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                className={`transition-colors pb-4 ${isPlaylistOpen ? "text-purple-500" : "hover:text-white"}`}
              >
                <X size={32} />
              </motion.button>
            </div>
            <ul className="overflow-y-auto space-y-2">
              {filteredPlaylist.map((track, index) => (
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
        </AnimatePresence>
      )}

      <audio
        ref={audioRef}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onEnded={onEnded}
        onVolumeChange={() => setVolume(audioRef.current?.volume ?? 0.75)}
        crossOrigin="anonymous"
      />
    </>
  );
}
