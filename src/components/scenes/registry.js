"use client";
/** Maps scene keys (used in portfolioData.js) to scene components. */
import IntersectionScene from "./IntersectionScene";
import NetworkScene from "./NetworkScene";
import MagazineScene from "./MagazineScene";
import PapersScene from "./PapersScene";
import MediaScene from "./MediaScene";
import CacheScene from "./CacheScene";
import GradcapScene from "./GradcapScene";
import MeetingScene from "./MeetingScene";
import ShelfScene from "./ShelfScene";
import FramesScene from "./FramesScene";
import ReelScene from "./ReelScene";
import MemoryScene from "./MemoryScene";
import BiasScene from "./BiasScene";
import GaitScene from "./GaitScene";
import ClusterScene from "./ClusterScene";
import SkillsScene from "./SkillsScene";
import CampusScene from "./CampusScene";
import NeuralScene from "./NeuralScene";
import BeaconScene from "./BeaconScene";
export const SCENE_COMPONENTS = {
  intersection: IntersectionScene,
  network: NetworkScene,
  magazine: MagazineScene,
  papers: PapersScene,
  media: MediaScene,
  cache: CacheScene,
  gradcap: GradcapScene,
  meeting: MeetingScene,
  shelf: ShelfScene,
  frames: FramesScene,
  reel: ReelScene,
  memory: MemoryScene,
  bias: BiasScene,
  gait: GaitScene,
  cluster: ClusterScene,
  skills: SkillsScene,
  campus: CampusScene,
  neural: NeuralScene,
  beacon: BeaconScene,
};
