import { initLlama, LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import ModelTemplate from '../provider/ModelTemplate';
import InferenceParameters from '../provider/Parameter';

class LlamaService {
  private context: LlamaContext | null = null;
  private isInitialized: boolean = false;
  private systemPrompt: string = ModelTemplate.systemPrompt;


  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('Model already initialized');
        return;
      }

      console.log('Initializing LLM model...');
      
      let modelPath: string;
      
      if (Platform.OS === 'android') {
        // For Android, copy model from assets to document directory
        const modelFileName = 'model.gguf';
        const destPath = `${RNFS.DocumentDirectoryPath}/${modelFileName}`;
        
        console.log('Checking if model exists at:', destPath);
        
        const exists = await RNFS.exists(destPath);
        
        if (!exists) {
          console.log('Model not found, copying from assets...');
          // Use copyFileAssets for Android bundled assets
          await RNFS.copyFileAssets(modelFileName, destPath);
          console.log('Model copied successfully to:', destPath);
        } else {
          console.log('Model already exists in document directory');
        }
        
        modelPath = destPath;
      } else {
        // iOS path (if needed later)
        modelPath = `${RNFS.MainBundlePath}/model.gguf`;
      }
      
      console.log('Loading model from:', modelPath);

      // Initialize llama context
      this.context = await initLlama({
        model: modelPath,
        n_ctx: 32768,  // LFM supports 32K context window (~25K words)
        n_gpu_layers: 0,  // Start with 0 GPU layers to test CPU-only first
        use_mlock: false,  // Disable mlock for initial testing
      });

      this.isInitialized = true;
      console.log('Model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize model:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async generateResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    memoryBlock?: string
  ): Promise<string> {
    if (!this.context || !this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    try {
      console.log('Generating response with', messages.length, 'messages in history');

      const memoryTurns: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (memoryBlock) {
        console.log('[LlamaService] Injecting memory block as recall exchange');
        memoryTurns.push({
          role: 'user' as const,
          content: 'Before we start, here are facts about me from our previous conversations:',
        });
        memoryTurns.push({
          role: 'assistant' as const,
          content:
            `Got it! I have two sources of memory about you:\n\n${memoryBlock}\n\n` +
            `The CONFIRMED FACTS are things I know for certain about you. ` +
            `The WHAT THE USER SAID section contains your exact words from before — ` +
            `I'll use both to remember everything about you. ` +
            `If any facts conflict, I'll trust the most recent one.`,
        });
      }

      const fullConversation = [
        { role: 'system' as const, content: this.systemPrompt },
        ...memoryTurns,
        ...messages,
      ];

      const formattedResult = await this.context.getFormattedChat(fullConversation);
      const formattedPrompt = typeof formattedResult === 'string' ? formattedResult : formattedResult.prompt;

      const result = await this.context.completion({
        prompt: formattedPrompt,
        ...InferenceParameters,
      });

      const response = result.text.trim();
      console.log('Generated response:', response);
      return response;
    } catch (error) {
      console.error('Failed to generate response:', error);
      throw error;
    }
  }

  /**
   * Streaming variant — calls onToken for every new token so the UI can
   * update the message bubble in real-time.  Returns the full response text.
   */
  async generateResponseStream(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onToken: (token: string) => void,
    memoryBlock?: string
  ): Promise<string> {
    if (!this.context || !this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    try {
      console.log('[LlamaService] Streaming response with', messages.length, 'messages in history');

      const memoryTurns: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (memoryBlock) {
        console.log('[LlamaService] Injecting memory block as recall exchange');
        memoryTurns.push({
          role: 'user' as const,
          content: 'Before we start, here are facts about me from our previous conversations:',
        });
        memoryTurns.push({
          role: 'assistant' as const,
          content:
            `Got it! I have two sources of memory about you:\n\n${memoryBlock}\n\n` +
            `The CONFIRMED FACTS are things I know for certain about you. ` +
            `The WHAT THE USER SAID section contains your exact words from before — ` +
            `I'll use both to remember everything about you. ` +
            `If any facts conflict, I'll trust the most recent one.`,
        });
      }

      const fullConversation = [
        { role: 'system' as const, content: this.systemPrompt },
        ...memoryTurns,
        ...messages,
      ];

      const formattedResult = await this.context.getFormattedChat(fullConversation);
      const formattedPrompt = typeof formattedResult === 'string' ? formattedResult : formattedResult.prompt;

      const result = await this.context.completion(
        {
          prompt: formattedPrompt,
          ...InferenceParameters,
        },
        // llama.rn passes each token to this callback as it is generated
        (data: { token: string }) => {
          onToken(data.token);
        }
      );

      const response = result.text.trim();
      console.log('[LlamaService] Streaming complete, total length:', response.length);
      return response;
    } catch (error) {
      console.error('[LlamaService] Streaming failed:', error);
      throw error;
    }
  }

  async release(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.isInitialized = false;
      console.log('Model released');
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    console.log('System prompt updated to:', prompt);
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }
}

export default new LlamaService();
