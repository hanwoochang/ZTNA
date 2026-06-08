import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { styles } from '../styles/styles';

type Props = {
    otp: string;
    setOtp: (otp: string) => void;
    handleVerifyOtp: () => void;
    handleResendOtp: () => void;
    onBack: () => void;
};

export const OtpScreen = ({ otp, setOtp, handleVerifyOtp, handleResendOtp, onBack }: Props) => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
            <Text style={styles.title}>🔐 2차 보안 인증</Text>
            <View style={styles.otpBox}>
                <Text style={styles.otpAlert}>⚠️ 새로운 기기 접속 감지됨</Text>
                <Text style={styles.infoText}>이메일로 전송된 인증번호 6자리를 입력하세요.</Text>
                <Text style={styles.hintText}>(제한시간 3분)</Text>
            </View>
            <TextInput
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
                placeholder="인증번호 6자리"
                keyboardType="number-pad"
                maxLength={6} />
            <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
                <Text style={styles.buttonText}>인증하고 출입증 받기</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{ marginTop: 10 }} onPress={handleResendOtp}>
                <Text style={styles.linkText}>인증번호가 오지 않나요? 재발송하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => {
                Keyboard.dismiss();
                onBack();}}>
                <Text style={styles.linkText}>로그인 화면으로 돌아가기</Text>
            </TouchableOpacity>
        </View>
    </TouchableWithoutFeedback>
);